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
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const {
  activateSubscriptionAfterPayment,
  autoVerifyByReference,
  handleMVolaWebhook,
  handleOrangeMoneyWebhook,
  PLAN_PRICES,
} = require('../jobs/subscriptionManager');

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

const MONTHLY_PRICE_MGA = 245000;

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

    res.json({
      status:         subscription.status,
      plan:           subscription.plan,
      is_expired:     isExpired || isTrialExp || ['EXPIRED','TRIAL_EXPIRED'].includes(subscription.status),
      is_trial:       ['TRIAL'].includes(subscription.status),
      days_remaining: daysRemaining,
      end_date:       subscription.end_date,
      trial_end_date: subscription.trial_end_date,
      price_mga:      MONTHLY_PRICE_MGA,
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
    doc.text(`Abonnement DentalPM PRO - ${monthName} ${year}`, 50, iY, { width:300 });
    doc.text(`${new Intl.NumberFormat('fr-MG').format(MONTHLY_PRICE_MGA)} Ar`, 400, iY, { width:100, align:'right' });
    doc.moveTo(50, iY+30).lineTo(550, iY+30).stroke();
    doc.font('Helvetica-Bold').text('TOTAL:', 300, iY+45, { width:100 });
    doc.text(`${new Intl.NumberFormat('fr-MG').format(MONTHLY_PRICE_MGA)} Ar`, 400, iY+45, { width:100, align:'right' });
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
