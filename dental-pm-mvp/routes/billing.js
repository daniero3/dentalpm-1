/**
 * dental-pm-mvp/routes/billing.js
 *
 * Routes de facturation avec paiement automatique :
 * ─ Webhooks MVola / Orange Money → activation immédiate
 * ─ Soumission référence → vérification auto
 * ─ Statut abonnement en temps réel
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { Clinic, Subscription, PaymentRequest, AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// ── Fonctions de gestion automatique (inlinées) ─────────────────────────
const PLAN_PRICES = { ESSENTIAL: 149000, PRO: 199000, GROUP: 299000 };
const PLAN_DAYS   = 30;
const { Op } = require('sequelize');

async function activateSubscriptionAfterPayment(clinicId, planCode, paymentRequestId) {
  try {
    const now     = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + PLAN_DAYS);

    await Subscription.update(
      { status: 'SUPERSEDED' },
      { where: { clinic_id: clinicId, status: { [Op.in]: ['ACTIVE','TRIAL','EXPIRED','TRIAL_EXPIRED'] } } }
    );

    const newSub = await Subscription.create({
      clinic_id:         clinicId,
      plan:              planCode || 'PRO',
      status:            'ACTIVE',
      start_date:        now,
      end_date:          endDate,
      duration_months:   1,
      monthly_price_mga: PLAN_PRICES[planCode] || PLAN_PRICES.PRO,
      auto_renew:        false,
    });

    await Clinic.update(
      { subscription_status: 'ACTIVE', current_plan: planCode || 'PRO' },
      { where: { id: clinicId } }
    );

    if (paymentRequestId) {
      await PaymentRequest.update(
        { status: 'VERIFIED', verified_at: now },
        { where: { id: paymentRequestId } }
      );
    }
    console.log(`[AutoPay] Abonnement activé : clinic=${clinicId} plan=${planCode}`);
    return { success: true, subscription: newSub };
  } catch (e) {
    console.error('[AutoPay] Erreur activation:', e.message);
    return { success: false, error: e.message };
  }
}

async function autoVerifyByReference(reference, clinicId) {
  try {
    if (!reference || !clinicId) return { verified: false, reason: 'Données manquantes' };
    const payReq = await PaymentRequest.findOne({
      where: { clinic_id: clinicId, reference: reference.trim(), status: 'PENDING' }
    });
    if (!payReq) return { verified: false, reason: 'Aucune demande en attente avec cette référence' };
    if (payReq.amount_mga !== PLAN_PRICES[payReq.plan_code])
      return { verified: false, reason: 'Montant incohérent' };
    const result = await activateSubscriptionAfterPayment(clinicId, payReq.plan_code, payReq.id);
    return result.success
      ? { verified: true, plan: payReq.plan_code, amount: payReq.amount_mga }
      : { verified: false, reason: result.error };
  } catch (e) { return { verified: false, reason: e.message }; }
}

async function handleMVolaWebhook(payload) {
  try {
    const { transactionReference, amount, status, serverCorrelationId } = payload;
    if (status !== 'COMPLETED') return { processed: false, reason: 'Non complété' };
    const payReq = await PaymentRequest.findOne({
      where: {
        [Op.or]: [{ reference: serverCorrelationId }, { reference: transactionReference }],
        status: 'PENDING', payment_method: 'MVOLA',
      }
    });
    if (!payReq) return { processed: false, reason: 'Demande non trouvée' };
    if (parseInt(amount) < payReq.amount_mga) return { processed: false, reason: 'Montant insuffisant' };
    const result = await activateSubscriptionAfterPayment(payReq.clinic_id, payReq.plan_code, payReq.id);
    return { processed: result.success };
  } catch (e) { return { processed: false, error: e.message }; }
}

async function handleOrangeMoneyWebhook(payload) {
  try {
    const { txnid, txnstatus, amount, message } = payload;
    if (txnstatus !== 'Success' && txnstatus !== 'COMPLETED') return { processed: false };
    const payReq = await PaymentRequest.findOne({
      where: {
        [Op.or]: [{ reference: txnid }, { reference: message }],
        status: 'PENDING', payment_method: 'ORANGE_MONEY',
      }
    });
    if (!payReq || parseInt(amount) < payReq.amount_mga) return { processed: false };
    const result = await activateSubscriptionAfterPayment(payReq.clinic_id, payReq.plan_code, payReq.id);
    return { processed: result.success };
  } catch (e) { return { processed: false, error: e.message }; }
}

// ── Cron désabonnement auto (toutes les heures) ──────────────────────────
function startSubscriptionCron() {
  async function runChecks() {
    try {
      const now = new Date();
      const expired = await Subscription.findAll({ where: { status: 'ACTIVE', end_date: { [Op.lt]: now } } });
      for (const s of expired) {
        await s.update({ status: 'EXPIRED' });
        await Clinic.update({ subscription_status: 'EXPIRED' }, { where: { id: s.clinic_id } });
        console.log(`[Cron] Abonnement expiré : clinic=${s.clinic_id}`);
      }
      const expTrials = await Subscription.findAll({
        where: { status: 'TRIAL', [Op.or]: [{ end_date: { [Op.lt]: now } }, { trial_end_date: { [Op.lt]: now } }] }
      });
      for (const s of expTrials) {
        await s.update({ status: 'TRIAL_EXPIRED' });
        await Clinic.update({ subscription_status: 'TRIAL_EXPIRED' }, { where: { id: s.clinic_id } });
        console.log(`[Cron] Trial expiré : clinic=${s.clinic_id}`);
      }
    } catch (e) { console.error('[Cron] Erreur:', e.message); }
  }
  runChecks();
  setInterval(runChecks, 60 * 60 * 1000);
  console.log('[Cron] Gestionnaire abonnements démarré (intervalle: 1h)');
}

const _getUserId = (req) => {
  const v = req.user?.id || req.user?.dataValues?.id || req.user?.userId;
  if (v) return v;
  try {
    const t = req.headers?.authorization?.split(' ')[1];
    return t ? (jwt.verify(t, process.env.JWT_SECRET).userId || null) : null;
  } catch(e) { return null; }
};

const getClinicId = (req) =>
  req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id;

const router = express.Router();

const MONTHLY_PRICE_MGA = 199000; // Défaut PRO — remplacé dynamiquement selon le plan

// ── Générer une référence unique DPM ─────────────────────────────────────
function generateRef(clinicId) {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DPM-${ts}-${rand}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/billing/status — Statut abonnement actuel
// ═══════════════════════════════════════════════════════════════════════════
router.get('/status', async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: { clinic_id: getClinicId(req) },
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      return res.json({
        status: 'NO_SUBSCRIPTION', needs_payment: true,
        message: 'Aucun abonnement trouvé'
      });
    }

    const now           = new Date();
    const isExpired     = subscription.end_date && new Date(subscription.end_date) < now;
    const isTrialExp    = ['TRIAL','TRIAL_EXPIRED'].includes(subscription.status) &&
                          subscription.trial_end_date &&
                          new Date(subscription.trial_end_date) < now;
    let daysRemaining   = 0;
    if (subscription.end_date) {
      const diff = new Date(subscription.end_date).getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const hasAccess = ['ACTIVE','TRIAL'].includes(subscription.status) && !isExpired && !isTrialExp;
    res.json({
      status:         subscription.status,
      plan:           subscription.plan,
      has_access:     hasAccess,
      is_expired:     isExpired || isTrialExp || ['EXPIRED','TRIAL_EXPIRED'].includes(subscription.status),
      is_trial:       ['TRIAL'].includes(subscription.status),
      days_remaining: daysRemaining,
      end_date:       subscription.end_date,
      trial_end_date: subscription.trial_end_date,
      price_mga:      PLAN_PRICES[subscription.plan] || MONTHLY_PRICE_MGA,
      needs_payment:  isExpired || isTrialExp || ['EXPIRED','TRIAL_EXPIRED','SUPERSEDED'].includes(subscription.status),
    });
  } catch (error) {
    console.error('Billing status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/billing/subscription
// ═══════════════════════════════════════════════════════════════════════════
router.get('/subscription', async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: { clinic_id: getClinicId(req) },
      order: [['created_at', 'DESC']]
    });
    if (!subscription) return res.json({ subscription: null });
    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/billing/payment-requests
// ═══════════════════════════════════════════════════════════════════════════
router.get('/payment-requests', async (req, res) => {
  try {
    const paymentRequests = await PaymentRequest.findAll({
      where: { clinic_id: getClinicId(req) },
      order: [['created_at', 'DESC']],
      limit: 20
    });
    res.json({ paymentRequests });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/billing/payment-requests — Initier une demande de paiement
//   Génère une référence unique et retourne les instructions
// ═══════════════════════════════════════════════════════════════════════════
router.post('/payment-requests', [
  body('plan_code').isIn(['ESSENTIAL', 'PRO', 'GROUP']),
  body('payment_method').isIn(['MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'BANK_TRANSFER', 'CASH'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    const { plan_code, payment_method, reference: userRef } = req.body;
    const amount    = PLAN_PRICES[plan_code];
    const clinicId  = getClinicId(req);
    if (!clinicId) return res.status(400).json({ error: 'Clinique non identifiée. Reconnectez-vous.' });

    // Annuler les demandes PENDING précédentes pour cette clinique
    await PaymentRequest.update(
      { status: 'REJECTED', note_admin: 'Remplacée par une nouvelle demande' },
      { where: { clinic_id: clinicId, status: 'PENDING' } }
    );

    // Générer une référence unique DPM
    const dpmRef = userRef?.trim() || generateRef(clinicId);

    const paymentRequest = await PaymentRequest.create({
      clinic_id:           clinicId,
      submitted_by_user_id: _getUserId(req),
      plan_code,
      amount_mga:          amount,
      payment_method,
      reference:           dpmRef,
      status:              'PENDING'
    });

    try {
      await AuditLog.create({
        user_id:       _getUserId(req),
        action:        'CREATE',
        resource_type: 'payment_request',
        resource_id:   paymentRequest.id,
        new_values:    { plan_code, amount, payment_method, reference: dpmRef },
        description:   `Demande paiement plan ${plan_code}: ${amount} Ar via ${payment_method}`
      });
    } catch (_) {}

    // Instructions de paiement selon la méthode
    const instructions = getPaymentInstructions(payment_method, amount, dpmRef);

    res.status(201).json({
      message: 'Demande initiée. Suivez les instructions ci-dessous.',
      paymentRequest: {
        id:             paymentRequest.id,
        plan_code,
        amount_mga:     amount,
        payment_method,
        reference:      dpmRef,
        status:         'PENDING',
        created_at:     paymentRequest.created_at,
      },
      instructions,
      auto_activation_info: 'Votre abonnement sera activé automatiquement dès confirmation du paiement (quelques secondes pour Mobile Money, jusqu\'à 2h pour virement bancaire).'
    });
  } catch (error) {
    console.error('Create payment-request error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/billing/verify-reference — Vérification auto par référence
//   Le user soumet sa référence de transaction → activation immédiate si valide
// ═══════════════════════════════════════════════════════════════════════════
router.post('/verify-reference', [
  body('reference').notEmpty().withMessage('Référence requise')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Référence manquante' });

    const clinicId  = getClinicId(req);
    const { reference } = req.body;

    const result = await autoVerifyByReference(reference, clinicId);

    if (result.verified) {
      return res.json({
        success:   true,
        message:   `🎉 Paiement vérifié ! Votre abonnement plan ${result.plan} est maintenant actif.`,
        plan:      result.plan,
        amount:    result.amount,
        activated: true,
      });
    }

    // Si pas encore vérifié automatiquement → demande en attente de validation admin
    return res.json({
      success: false,
      message: `Référence enregistrée. Notre équipe va valider votre paiement sous 2h. Votre abonnement sera activé automatiquement.`,
      pending: true,
      reason:  result.reason,
    });
  } catch (error) {
    console.error('Verify reference error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════



// ── POST /api/billing/customer-portal ─────────────────────────────────────────
// Redirige le client vers le portail Stripe pour gérer son abonnement
// (changer carte, annuler, réactiver, voir factures)
router.post('/customer-portal', async (req, res) => {
  try {
    const stripe    = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const clinicId  = getClinicId(req);
    if (!clinicId) return res.status(400).json({ error: 'Cabinet non identifié' });

    const { Clinic } = require('../models');
    const clinic = await Clinic.findByPk(clinicId);
    if (!clinic) return res.status(404).json({ error: 'Cabinet non trouvé' });

    const FRONT = process.env.FRONTEND_URL || 'https://gracious-serenity-production-e854.up.railway.app';

    let customerId = clinic.stripe_customer_id;

    // Créer le customer Stripe si pas encore fait
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: clinic.email,
        name:  clinic.name,
        metadata: { clinic_id: clinicId }
      });
      customerId = customer.id;
      await clinic.update({ stripe_customer_id: customerId });
    }

    // Créer la session du portail Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${FRONT}/subscription?portal=returned`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Customer portal error:', error.message);
    res.status(500).json({ error: 'Erreur Stripe Portal', details: error.message });
  }
});

// ── GET /api/billing/payment-method ───────────────────────────────────────────
// Retourne la carte enregistrée pour ce cabinet
router.get('/payment-method', async (req, res) => {
  try {
    const stripe   = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const clinicId = getClinicId(req);
    if (!clinicId) return res.status(400).json({ error: 'Cabinet non identifié' });

    const { Clinic } = require('../models');
    const clinic = await Clinic.findByPk(clinicId);
    if (!clinic?.stripe_customer_id) {
      return res.json({ card: null, subscription: null });
    }

    // Récupérer les moyens de paiement du customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: clinic.stripe_customer_id,
      type: 'card'
    });

    // Récupérer l'abonnement actif Stripe
    let stripeSub = null;
    try {
      const subs = await stripe.subscriptions.list({
        customer: clinic.stripe_customer_id,
        status: 'all',
        limit: 1
      });
      if (subs.data.length > 0) stripeSub = subs.data[0];
    } catch(e) {}

    const card = paymentMethods.data[0]?.card || null;
    const pm   = paymentMethods.data[0] || null;

    res.json({
      card: card ? {
        brand:    card.brand,
        last4:    card.last4,
        exp_month: card.exp_month,
        exp_year:  card.exp_year,
        pm_id:    pm.id
      } : null,
      subscription: stripeSub ? {
        id:     stripeSub.id,
        status: stripeSub.status,
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        current_period_end:   stripeSub.current_period_end,
        trial_end: stripeSub.trial_end,
      } : null
    });
  } catch (error) {
    console.error('Payment method error:', error.message);
    res.status(500).json({ error: 'Erreur Stripe', details: error.message });
  }
});

// ── POST /api/billing/create-checkout-session ─────────────────────────────────
router.post('/create-checkout-session', async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { plan_code, clinic_id: bodyClinicId } = req.body;

    const STRIPE_PRICE_IDS = {
      ESSENTIAL: 'price_1TM2Yr4zCGinpjiEssURjhxa',
      PRO:       'price_1TM2Ct4zCGinpjiEQ9KqgVdN',
      GROUP:     'price_1TM2m34zCGinpjiEOo3nR5CQ',
    };

    const priceId = STRIPE_PRICE_IDS[plan_code];
    if (!priceId) return res.status(400).json({ error: 'Plan invalide' });

    const clinicId = bodyClinicId || getClinicId(req);
    if (!clinicId) return res.status(400).json({ error: 'Cabinet non identifie' });

    const { Clinic } = require('../models');
    const clinic = await Clinic.findByPk(clinicId, { attributes: ['id','name','email'] });
    if (!clinic) return res.status(404).json({ error: 'Cabinet non trouve' });

    const FRONT = process.env.FRONTEND_URL || 'https://gracious-serenity-production-e854.up.railway.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { clinic_id: clinicId, plan: plan_code }
      },
      customer_email: clinic.email,
      metadata: { clinic_id: clinicId, plan: plan_code },
      success_url: FRONT + '/subscription?checkout=success&plan=' + plan_code,
      cancel_url:  FRONT + '/subscription?checkout=cancelled',
      locale: 'fr',
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    res.status(500).json({ error: 'Erreur Stripe', details: error.message });
  }
});

// ── POST /api/billing/webhook/stripe — Webhook Stripe ────────────────────────
router.post('/webhook/stripe', express.raw({ type:'application/json' }), async (req, res) => {
  const sig       = req.headers['stripe-signature'];
  const secret    = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (secret) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } else {
      // Mode dev sans vérification de signature
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).json({ error: 'Webhook signature invalide' });
  }

  try {
    const obj      = event.data.object;
    const metadata = obj.metadata || obj.subscription_data?.metadata || {};
    let clinicId   = metadata.clinic_id;
    let planCode   = metadata.plan || 'PRO';

    // Récupérer clinic_id depuis la subscription si absent
    if (!clinicId && obj.subscription) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const sub = await stripe.subscriptions.retrieve(obj.subscription);
        clinicId = sub.metadata?.clinic_id;
        planCode = sub.metadata?.plan || planCode;
      } catch(e) {}
    }

    // ── checkout.session.completed → client a entré sa carte, trial démarre ──
    if (event.type === 'checkout.session.completed') {
      console.log(`[Stripe] Checkout complété: clinic=${clinicId} plan=${planCode}`);
      if (clinicId) {
        try {
          const { Clinic, Subscription } = require('../models');

          // Mettre à jour ou créer l'abonnement TRIAL dans notre DB
          const now      = new Date();
          const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const PLAN_PRICES = { ESSENTIAL:149000, PRO:199000, GROUP:299000 };
          const PLAN_USERS  = { ESSENTIAL:2, PRO:5, GROUP:50 };

          // Superseder l'ancien abonnement
          await Subscription.update(
            { status: 'SUPERSEDED' },
            { where: { clinic_id: clinicId, status: { [require('sequelize').Op.in]: ['ACTIVE','TRIAL','EXPIRED','TRIAL_EXPIRED'] } } }
          ).catch(()=>{});

          // Créer abonnement TRIAL (Stripe prélèvera au J+7)
          await Subscription.create({
            clinic_id:         clinicId,
            plan:              planCode,
            status:            'TRIAL',
            start_date:        now,
            trial_end_date:    trialEnd,
            end_date:          trialEnd,
            max_practitioners: PLAN_USERS[planCode] || 5,
            price_mga:         PLAN_PRICES[planCode] || 199000,
            stripe_subscription_id: obj.subscription || null,
          }).catch(()=>{});

          // Mettre à jour le cabinet
          await Clinic.update(
            { subscription_status: 'TRIAL', current_plan: planCode, is_active: true },
            { where: { id: clinicId } }
          ).catch(()=>{});

          // Email de bienvenue
          try {
            const clinic = await Clinic.findByPk(clinicId);
            if (clinic?.email) {
              const { sendWelcomeTrial } = require('../utils/mailer');
              await sendWelcomeTrial(clinic.email, clinic.name, planCode, trialEnd);
            }
          } catch(e) {}

          console.log(`[Stripe] Trial activé: clinic=${clinicId} plan=${planCode} trial_end=${trialEnd.toDateString()}`);
        } catch(e) {
          console.error('[Stripe] Erreur activation trial:', e.message);
        }
      }
    }

    // ── invoice.payment_succeeded → paiement réussi (J+7 et renouvellements) ──
    if (event.type === 'invoice.payment_succeeded' && obj.billing_reason !== 'subscription_create') {
      if (clinicId) {
        const { activateSubscriptionAfterPayment } = require('../job/subscriptionManager');
        await activateSubscriptionAfterPayment(clinicId, planCode, null);

        try {
          const { Clinic, Subscription } = require('../models');
          const clinic = await Clinic.findByPk(clinicId);
          if (clinic) {
            const sub = await Subscription.findOne({ where: { clinic_id: clinicId, status: 'ACTIVE' }, order: [['created_at','DESC']] });
            const { sendSubscriptionActivated } = require('../utils/mailer');
            await sendSubscriptionActivated(clinic.email, clinic.name, planCode, sub?.end_date);
          }
        } catch(e) {}
        console.log(`[Stripe] Paiement réussi → abonnement activé: clinic=${clinicId} plan=${planCode}`);
      }
    }

    // ── customer.subscription.trial_will_end → rappel J-3 avant fin essai ──
    if (event.type === 'customer.subscription.trial_will_end') {
      if (clinicId) {
        try {
          const { Clinic, Subscription } = require('../models');
          const clinic = await Clinic.findByPk(clinicId);
          const sub    = await Subscription.findOne({ where: { clinic_id: clinicId } });
          if (clinic && sub) {
            const { sendTrialReminder } = require('../utils/mailer');
            await sendTrialReminder(clinic.email, clinic.name, 3, sub.plan);
          }
        } catch(e) {}
        console.log(`[Stripe] Trial va expirer: clinic=${clinicId}`);
      }
    }

    // ── customer.subscription.updated → trial → actif après paiement J+7 ──
    if (event.type === 'customer.subscription.updated') {
      const subObj = obj;
      if (clinicId && subObj.status === 'active' && !subObj.trial_end) {
        // Trial terminé, abonnement maintenant actif (Stripe a prélevé)
        const { activateSubscriptionAfterPayment } = require('../job/subscriptionManager');
        await activateSubscriptionAfterPayment(clinicId, planCode, null).catch(()=>{});
        console.log(`[Stripe] Subscription updated → active: clinic=${clinicId} plan=${planCode}`);
      }
    }

    // ── customer.subscription.deleted → abonnement annulé par Stripe ──────
    if (event.type === 'customer.subscription.deleted') {
      if (clinicId) {
        const { Clinic, Subscription } = require('../models');
        await Subscription.update({ status: 'CANCELLED' }, { where: { clinic_id: clinicId, status: { [require('sequelize').Op.in]: ['ACTIVE','TRIAL'] } } });
        await Clinic.update({ subscription_status: 'CANCELLED' }, { where: { id: clinicId } });
        console.log(`[Stripe] Abonnement annulé: clinic=${clinicId}`);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    res.status(500).json({ error: 'Erreur traitement webhook' });
  }
});

// POST /api/billing/webhook/mvola — Callback MVola (Telma)
//   Appelée automatiquement par l'API MVola après paiement réussi
//   SANS authentification (endpoint public, sécurisé par signature)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/webhook/mvola', async (req, res) => {
  try {
    // Vérifier la signature MVola si configurée
    const mvolaSecret = process.env.MVOLA_WEBHOOK_SECRET;
    if (mvolaSecret) {
      const signature = req.headers['x-mvola-signature'] || req.headers['x-signature'];
      const body      = JSON.stringify(req.body);
      const expected  = crypto.createHmac('sha256', mvolaSecret).update(body).digest('hex');
      if (signature !== expected && signature !== `sha256=${expected}`) {
        console.warn('[MVola Webhook] Signature invalide — requête rejetée');
        return res.status(401).json({ error: 'Signature invalide' });
      }
    }

    console.log('[MVola Webhook] Payload reçu:', JSON.stringify(req.body));
    const result = await handleMVolaWebhook(req.body);

    // MVola attend une réponse 200 rapide
    res.status(200).json({ received: true, processed: result.processed });
  } catch (error) {
    console.error('[MVola Webhook] Erreur:', error);
    res.status(200).json({ received: true, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/billing/webhook/orange — Callback Orange Money
// ═══════════════════════════════════════════════════════════════════════════
router.post('/webhook/orange', async (req, res) => {
  try {
    const orangeSecret = process.env.ORANGE_WEBHOOK_SECRET;
    if (orangeSecret) {
      const signature = req.headers['x-orange-signature'] || req.headers['authorization'];
      if (!signature || !signature.includes(orangeSecret)) {
        console.warn('[Orange Webhook] Token invalide');
        return res.status(401).json({ error: 'Token invalide' });
      }
    }

    console.log('[Orange Webhook] Payload reçu:', JSON.stringify(req.body));
    const result = await handleOrangeMoneyWebhook(req.body);
    res.status(200).json({ received: true, processed: result.processed });
  } catch (error) {
    console.error('[Orange Webhook] Erreur:', error);
    res.status(200).json({ received: true, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/billing/webhook/generic — Webhook générique (Airtel, virement...)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/webhook/generic', async (req, res) => {
  try {
    const { reference, clinic_id, amount, method, status } = req.body;
    const webhookKey = process.env.WEBHOOK_SECRET_KEY;

    // Vérifier la clé secrète
    const providedKey = req.headers['x-webhook-key'];
    if (webhookKey && providedKey !== webhookKey) {
      return res.status(401).json({ error: 'Clé invalide' });
    }

    if (status !== 'SUCCESS' && status !== 'COMPLETED') {
      return res.json({ processed: false, reason: 'Statut non réussi' });
    }

    const result = await autoVerifyByReference(reference, clinic_id);
    res.json({ processed: result.verified, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/billing/renew (legacy — gardé pour compatibilité)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/renew', [
  body('payment_method').isIn(['MOBILE_MONEY', 'BANK_TRANSFER', 'CASH']),
], async (req, res) => {
  const { payment_method, months = 1, reference } = req.body;
  const amount    = MONTHLY_PRICE_MGA * months;
  const clinicId  = getClinicId(req);
  const dpmRef    = reference || generateRef(clinicId);

  try {
    const paymentRequest = await PaymentRequest.create({
      clinic_id:            clinicId,
      submitted_by_user_id: _getUserId(req),
      plan_code:            'PRO',
      amount_mga:           amount,
      payment_method,
      reference:            dpmRef,
      status:               'PENDING'
    });
    res.status(201).json({ message: 'Demande soumise.', payment_request: paymentRequest });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Route legacy payments ─────────────────────────────────────────────────
router.get('/payments', async (req, res) => {
  try {
    const payments = await PaymentRequest.findAll({
      where: { clinic_id: getClinicId(req) },
      order: [['created_at', 'DESC']],
      limit: 10
    });
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Facture PDF ───────────────────────────────────────────────────────────
router.get('/invoice/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const clinic = await Clinic.findByPk(getClinicId(req));
    if (!clinic) return res.status(404).json({ error: 'Clinique non trouvée' });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=facture-abonnement-${year}-${month}.pdf`);
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').text('FACTURE ABONNEMENT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`N° ABO-${year}-${String(month).padStart(2,'0')}`, { align:'right' });
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, { align:'right' });
    doc.moveDown(2);
    doc.font('Helvetica-Bold').text('FACTURÉ À:');
    doc.font('Helvetica').text(clinic.name);
    doc.text(clinic.address || 'Antananarivo, Madagascar');
    if (clinic.nif_number) doc.text(`NIF: ${clinic.nif_number}`);
    doc.moveDown(2);

    const monthName = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][parseInt(month)-1] || '';
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').text('Description', 50, tableTop, { width:300 });
    doc.text('Montant', 400, tableTop, { width:100, align:'right' });
    doc.moveTo(50, tableTop+20).lineTo(550, tableTop+20).stroke();
    doc.font('Helvetica');
    const iY = tableTop + 30;
    // description remplacée par le bloc dynamique ci-dessous
    // Prix selon le plan actif de la clinique
    const clinicPlan  = clinic.current_plan || 'PRO';
    const planAmount  = PLAN_PRICES[clinicPlan] || MONTHLY_PRICE_MGA;
    const fmtAmt      = new Intl.NumberFormat('fr-MG').format(planAmount);
    doc.text(`Plan ${clinicPlan} — Abonnement DentalPM`, 50, iY, { width:300 });
    doc.text(`${fmtAmt} Ar`, 400, iY, { width:100, align:'right' });
    doc.moveTo(50, iY+30).lineTo(550, iY+30).stroke();
    doc.font('Helvetica-Bold').text('TOTAL:', 300, iY+45, { width:100 });
    doc.text(`${fmtAmt} Ar`, 400, iY+45, { width:100, align:'right' });
    // QR Code
    try {
      const qrData = `DPM-ABO:${year}-${month} | ${clinic.name} | Plan ${clinic.current_plan||'PRO'} | ${new Intl.NumberFormat('fr-MG').format(PLAN_PRICES[clinic.current_plan]||MONTHLY_PRICE_MGA)} Ar`;
      const qrBuffer = await QRCode.toBuffer(qrData, { width: 80 });
      const qrY = doc.y + 20;
      doc.save()
         .roundedRect(50, qrY, 90, 90, 6)
         .fillColor('#f0fdfe')
         .fill()
         .strokeColor('#7dd3da')
         .stroke();
      doc.restore();
      doc.image(qrBuffer, 55, qrY + 5, { width: 80, height: 80 });
      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
         .text('QR Vérification', 50, qrY + 88, { width: 90, align: 'center' });
      doc.fillColor('#94a3b8').fontSize(7)
         .text('DPM Madagascar', 50, qrY + 98, { width: 90, align: 'center' });
    } catch(e) {}
    doc.end();
  } catch (error) {
    res.status(500).json({ error: 'Erreur génération facture' });
  }
});

// ── Instructions de paiement ──────────────────────────────────────────────
function getPaymentInstructions(method, amount, reference) {
  const amtFmt = new Intl.NumberFormat('fr-MG').format(amount) + ' Ar';

  switch (method) {
    case 'MVOLA':
      return {
        title:    '📱 Paiement MVola (Telma)',
        steps: [
          'Composez *111# sur votre téléphone Telma',
          `Sélectionnez "Payer un service" ou "Envoyer de l'argent"`,
          `Numéro destinataire : 034 XX XXX XX (DPM Madagascar)`,
          `Montant : ${amtFmt}`,
          `Référence / Motif : ${reference}`,
          'Confirmez avec votre code PIN MVola',
        ],
        reference,
        important: 'Votre abonnement sera activé automatiquement dans les 5 minutes après confirmation MVola.',
      };
    case 'ORANGE_MONEY':
      return {
        title:    '🟠 Paiement Orange Money',
        steps: [
          'Ouvrez l\'application Orange Money ou composez #144#',
          `Sélectionnez "Transfert" ou "Paiement marchand"`,
          `Numéro : 032 XX XXX XX (DPM Madagascar)`,
          `Montant : ${amtFmt}`,
          `Message/Référence : ${reference}`,
          'Validez avec votre code Orange Money',
        ],
        reference,
        important: 'Activation automatique dès confirmation Orange Money.',
      };
    case 'AIRTEL_MONEY':
      return {
        title:    '🔴 Paiement Airtel Money',
        steps: [
          'Ouvrez Airtel Money ou composez *109#',
          `Sélectionnez "Payer"`,
          `Numéro : 033 XX XXX XX (DPM Madagascar)`,
          `Montant : ${amtFmt}`,
          `Référence : ${reference}`,
        ],
        reference,
        important: 'Soumettez votre référence ci-dessous après paiement pour activation immédiate.',
      };
    case 'BANK_TRANSFER':
      return {
        title:    '🏦 Virement Bancaire ',
        steps: [
          'Effectuez un virement sur notre compte  Banquière',
          `Bénéficiaire : DPM Madagascar`,
          `RIB : Disponible sur demande (contact@dentalpracticemada.com)`,
          `Montant exact : ${amtFmt}`,
          `Motif obligatoire : ${reference}`,
        ],
        reference,
        important: 'Envoyez votre preuve de virement à contact@dentalpracticemada.com avec la référence ' + reference + '. Activation sous 2h ouvrables.',
      };
    case 'CASH':
      return {
        title:    '💵 Paiement en espèces',
        steps: [
          'Rendez-vous à nos bureaux à Antananarivo',
          `Adresse : Tsiadana Ampasanimalo, Antananarivo`,
          `Montant : ${amtFmt}`,
          `Référence à présenter : ${reference}`,
          'Horaires : Lun-Ven 8h-17h',
        ],
        reference,
        important: 'Votre abonnement sera activé immédiatement sur place.',
      };
    default:
      return { title: 'Instructions de paiement', reference, steps: [`Référence : ${reference}`, `Montant : ${amtFmt}`] };
  }
}

module.exports = router;
