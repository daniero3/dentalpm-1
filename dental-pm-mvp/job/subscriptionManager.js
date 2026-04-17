/**
 * dental-pm-mvp/jobs/subscriptionManager.js
 *
 * Gestion automatique des abonnements :
 * ─ Désactivation auto des abonnements expirés
 * ─ Vérification automatique des paiements par référence
 * ─ Notifications d'expiration (J-7, J-3, J-1)
 * ─ Intégration webhooks MVola / Orange Money
 */

const { Op } = require('sequelize');
const { Clinic, Subscription, PaymentRequest } = require('../models');

// ── Durée plan → jours ────────────────────────────────────────────────────
const PLAN_DAYS = 30; // 30 jours calendaires par mois d'abonnement

const PLAN_PRICES = {
  ESSENTIAL: 149000,
  PRO:       199000,
  GROUP:     299000,
};

// ── Logger simple ─────────────────────────────────────────────────────────
const log = (msg) => console.log(`[SubscriptionManager ${new Date().toISOString()}] ${msg}`);

// ═══════════════════════════════════════════════════════════════════════════
// 1. DÉSACTIVATION AUTOMATIQUE DES ABONNEMENTS EXPIRÉS
// ═══════════════════════════════════════════════════════════════════════════
async function deactivateExpiredSubscriptions() {
  try {
    const now = new Date();

    // Trouver tous les abonnements ACTIVE expirés
    const expired = await Subscription.findAll({
      where: {
        status: 'ACTIVE',
        end_date: { [Op.lt]: now },
      }
    });

    if (expired.length === 0) {
      log('Désactivation : aucun abonnement expiré trouvé.');
      return;
    }

    for (const sub of expired) {
      await sub.update({ status: 'EXPIRED' });

      // Mettre à jour la clinique
      await Clinic.update(
        { subscription_status: 'EXPIRED' },
        { where: { id: sub.clinic_id } }
      );

      log(`✅ Abonnement expiré désactivé : clinic_id=${sub.clinic_id} plan=${sub.plan} end_date=${sub.end_date}`);
    }

    log(`Désactivation terminée : ${expired.length} abonnement(s) désactivé(s).`);
  } catch (error) {
    log(`❌ Erreur désactivation abonnements : ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. DÉSACTIVATION AUTOMATIQUE DES TRIALS EXPIRÉS
// ═══════════════════════════════════════════════════════════════════════════
async function deactivateExpiredTrials() {
  try {
    const now = new Date();

    const expiredTrials = await Subscription.findAll({
      where: {
        status: 'TRIAL',
        [Op.or]: [
          { end_date:       { [Op.lt]: now } },
          { trial_end_date: { [Op.lt]: now } },
        ]
      }
    });

    if (expiredTrials.length === 0) {
      log('Trials : aucun trial expiré.');
      return;
    }

    for (const sub of expiredTrials) {
      await sub.update({ status: 'TRIAL_EXPIRED' });
      await Clinic.update(
        { subscription_status: 'TRIAL_EXPIRED' },
        { where: { id: sub.clinic_id } }
      );
      log(`✅ Trial expiré : clinic_id=${sub.clinic_id}`);
    }

    log(`Trials : ${expiredTrials.length} trial(s) expiré(s).`);
  } catch (error) {
    log(`❌ Erreur désactivation trials : ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ACTIVATION AUTOMATIQUE APRÈS PAIEMENT VÉRIFIÉ
//    Appelée depuis les webhooks MVola / Orange Money / après vérification admin
// ═══════════════════════════════════════════════════════════════════════════
async function activateSubscriptionAfterPayment(clinicId, planCode, paymentRequestId) {
  try {
    const now       = new Date();
    const endDate   = new Date();
    endDate.setDate(endDate.getDate() + PLAN_DAYS);

    // Désactiver l'ancien abonnement actif/trial
    await Subscription.update(
      { status: 'SUPERSEDED' },
      { where: { clinic_id: clinicId, status: { [Op.in]: ['ACTIVE', 'TRIAL', 'EXPIRED', 'TRIAL_EXPIRED'] } } }
    );

    // Créer le nouvel abonnement ACTIVE
    const newSub = await Subscription.create({
      clinic_id:          clinicId,
      plan:               planCode || 'PRO',
      status:             'ACTIVE',
      start_date:         now,
      end_date:           endDate,
      duration_months:    1,
      monthly_price_mga:  PLAN_PRICES[planCode] || PLAN_PRICES.PRO,
      auto_renew:         false,
    });

    // Mettre à jour la clinique
    await Clinic.update(
      { subscription_status: 'ACTIVE', current_plan: planCode || 'PRO' },
      { where: { id: clinicId } }
    );

    // Marquer la PaymentRequest comme VERIFIED
    if (paymentRequestId) {
      await PaymentRequest.update(
        { status: 'VERIFIED', verified_at: now },
        { where: { id: paymentRequestId } }
      );
    }

    log(`✅ Abonnement activé automatiquement : clinic_id=${clinicId} plan=${planCode} end=${endDate.toDateString()}`);

    // Email de confirmation d'activation
    try {
      const clinic = await require('../models').Clinic.findByPk(clinicId);
      if (clinic?.email) {
        const { sendSubscriptionActivated } = require('../utils/mailer');
        await sendSubscriptionActivated(clinic.email, clinic.name, planCode, endDate);
      }
    } catch(e) { log(`⚠️ Email activation (non-fatal): ${e.message}`); }

    return { success: true, subscription: newSub };
  } catch (error) {
    log(`❌ Erreur activation abonnement : ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. VÉRIFICATION AUTOMATIQUE PAR RÉFÉRENCE (MVola / Orange)
//    Le user soumet sa référence de transaction → auto-match et activation
// ═══════════════════════════════════════════════════════════════════════════
async function autoVerifyByReference(reference, clinicId) {
  try {
    if (!reference || !clinicId) return { verified: false, reason: 'Référence ou clinique manquante' };

    // Chercher une PaymentRequest PENDING avec cette référence pour cette clinique
    const payReq = await PaymentRequest.findOne({
      where: {
        clinic_id: clinicId,
        reference: reference.trim(),
        status:    'PENDING',
      }
    });

    if (!payReq) {
      // Pas de demande avec cette référence — peut être une ancienne ou incorrecte
      return { verified: false, reason: 'Aucune demande en attente avec cette référence' };
    }

    // Vérifier que le montant correspond au plan
    const expectedAmount = PLAN_PRICES[payReq.plan_code];
    if (payReq.amount_mga !== expectedAmount) {
      return { verified: false, reason: 'Montant incohérent avec le plan' };
    }

    // Auto-activer
    const result = await activateSubscriptionAfterPayment(clinicId, payReq.plan_code, payReq.id);
    if (result.success) {
      return { verified: true, plan: payReq.plan_code, amount: payReq.amount_mga };
    }
    return { verified: false, reason: result.error };
  } catch (error) {
    log(`❌ Erreur auto-vérification référence : ${error.message}`);
    return { verified: false, reason: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. HANDLER WEBHOOK MVOLA
//    Reçoit la callback de Telma MVola après paiement réussi
// ═══════════════════════════════════════════════════════════════════════════
async function handleMVolaWebhook(payload) {
  try {
    log(`MVola webhook reçu : ${JSON.stringify(payload)}`);
    const {
      transactionReference,  // Référence unique MVola
      amount,                // Montant en Ar
      status,                // "COMPLETED" ou autre
      customerMSISDN,        // Numéro du payeur
      serverCorrelationId,   // ID de corrélation (référence DPM)
    } = payload;

    if (status !== 'COMPLETED') {
      log(`MVola : transaction non complétée (status=${status})`);
      return { processed: false, reason: 'Transaction non complétée' };
    }

    // Chercher la PaymentRequest par référence serverCorrelationId ou transactionReference
    const payReq = await PaymentRequest.findOne({
      where: {
        [Op.or]: [
          { reference: serverCorrelationId },
          { reference: transactionReference },
        ],
        status: 'PENDING',
        payment_method: { [Op.in]: ['MVOLA'] },
      }
    });

    if (!payReq) {
      log(`MVola : aucune demande trouvée pour référence ${serverCorrelationId || transactionReference}`);
      return { processed: false, reason: 'Demande non trouvée' };
    }

    // Vérifier le montant
    if (parseInt(amount) < payReq.amount_mga) {
      log(`MVola : montant insuffisant (reçu=${amount}, attendu=${payReq.amount_mga})`);
      return { processed: false, reason: 'Montant insuffisant' };
    }

    // Activer l'abonnement
    const result = await activateSubscriptionAfterPayment(payReq.clinic_id, payReq.plan_code, payReq.id);
    log(`MVola : activation ${result.success ? 'réussie' : 'échouée'} pour clinic=${payReq.clinic_id}`);
    return { processed: result.success, ...result };
  } catch (error) {
    log(`❌ Erreur handler MVola : ${error.message}`);
    return { processed: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. HANDLER WEBHOOK ORANGE MONEY
// ═══════════════════════════════════════════════════════════════════════════
async function handleOrangeMoneyWebhook(payload) {
  try {
    log(`Orange Money webhook reçu : ${JSON.stringify(payload)}`);
    const {
      txnid,        // ID transaction Orange
      txnstatus,    // "Success" ou autre
      amount,       // Montant
      msisdn,       // Numéro payeur
      message,      // Message (référence DPM)
    } = payload;

    if (txnstatus !== 'Success' && txnstatus !== 'COMPLETED') {
      return { processed: false, reason: 'Transaction Orange non réussie' };
    }

    // Chercher par référence (message contient notre référence DPM)
    const payReq = await PaymentRequest.findOne({
      where: {
        [Op.or]: [
          { reference: txnid },
          { reference: message },
        ],
        status: 'PENDING',
        payment_method: 'ORANGE_MONEY',
      }
    });

    if (!payReq) {
      log(`Orange : aucune demande trouvée pour ${txnid}`);
      return { processed: false, reason: 'Demande non trouvée' };
    }

    if (parseInt(amount) < payReq.amount_mga) {
      return { processed: false, reason: 'Montant insuffisant' };
    }

    const result = await activateSubscriptionAfterPayment(payReq.clinic_id, payReq.plan_code, payReq.id);
    return { processed: result.success };
  } catch (error) {
    log(`❌ Erreur handler Orange Money : ${error.message}`);
    return { processed: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. BOUCLE CRON PRINCIPALE (exécutée toutes les heures via setInterval)
// ═══════════════════════════════════════════════════════════════════════════
function startSubscriptionCron() {
  log('🚀 Démarrage du gestionnaire automatique d\'abonnements');

  // Exécution immédiate au démarrage
  runAllChecks();

  // Puis toutes les heures
  const INTERVAL_MS = 60 * 60 * 1000; // 1 heure
  setInterval(runAllChecks, INTERVAL_MS);
}

async function runAllChecks() {
  log('── Cycle de vérification abonnements ──');
  await deactivateExpiredSubscriptions();
  await deactivateExpiredTrials();
  await sendTrialReminderEmails();
  log('── Fin du cycle ──');
}


// ═══════════════════════════════════════════════════════════════════════════
// 5. EMAILS DE RAPPEL TRIAL — J-3 et J-1 avant expiration
// ═══════════════════════════════════════════════════════════════════════════
async function sendTrialReminderEmails() {
  try {
    const { sendTrialReminder } = require('../utils/mailer');
    const now = new Date();

    for (const daysLeft of [3, 1]) {
      const targetStart = new Date(now);
      targetStart.setDate(targetStart.getDate() + daysLeft);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(targetStart);
      targetEnd.setHours(23, 59, 59, 999);

      const trials = await Subscription.findAll({
        where: {
          status: 'TRIAL',
          end_date: { [Op.between]: [targetStart, targetEnd] }
        }
      });

      for (const sub of trials) {
        try {
          const clinic = await require('../models').Clinic.findByPk(sub.clinic_id);
          if (clinic?.email) {
            await sendTrialReminder(clinic.email, clinic.name, daysLeft, sub.plan);
            log(`📧 Rappel J-${daysLeft} envoyé → ${clinic.email} (${clinic.name})`);
          }
        } catch(e) {
          log(`⚠️ Rappel email (non-fatal) clinic=${sub.clinic_id}: ${e.message}`);
        }
      }

      if (trials.length > 0) {
        log(`Rappels J-${daysLeft} : ${trials.length} email(s) envoyé(s).`);
      } else {
        log(`Rappels J-${daysLeft} : aucun trial à notifier.`);
      }
    }
  } catch (error) {
    log(`❌ Erreur envoi rappels trial : ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
module.exports = {
  startSubscriptionCron,
  activateSubscriptionAfterPayment,
  autoVerifyByReference,
  handleMVolaWebhook,
  handleOrangeMoneyWebhook,
  deactivateExpiredSubscriptions,
  deactivateExpiredTrials,
  sendTrialReminderEmails,
  PLAN_PRICES,
  PLAN_DAYS,
};
