/**
 * DentalPM — Cron Jobs (node-cron)
 *
 * Tâches planifiées :
 *  1. Toutes les heures  → désactiver trials/abonnements expirés
 *  2. 08h00 chaque jour  → emails rappel J-3 et J-1 avant fin trial
 *  3. 09h00 chaque jour  → emails rappel renouvellement abonnement
 *  4. Minuit chaque nuit → nettoyage logs anciens
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Clinic, Subscription } = require('../models');

const log = msg => console.log(`[CronJob ${new Date().toISOString()}] ${msg}`);

const PLAN_PRICES = { ESSENTIAL:149000, PRO:199000, GROUP:299000 };
const PLAN_DAYS   = 30;

// ════════════════════════════════════════════════════════════════════════════
// 1. DÉSACTIVATION ABONNEMENTS EXPIRÉS
// ════════════════════════════════════════════════════════════════════════════
async function deactivateExpiredSubscriptions() {
  try {
    const now     = new Date();
    const expired = await Subscription.findAll({
      where: { status:'ACTIVE', end_date: { [Op.lt]: now } }
    });
    for (const sub of expired) {
      await sub.update({ status:'EXPIRED' });
      await Clinic.update({ subscription_status:'EXPIRED' }, { where:{ id:sub.clinic_id } });
      log(`Abonnement expiré: clinic=${sub.clinic_id} plan=${sub.plan}`);
    }
    if (expired.length) log(`${expired.length} abonnement(s) désactivé(s)`);
  } catch(e) { log(`❌ deactivateExpired: ${e.message}`); }
}

// ════════════════════════════════════════════════════════════════════════════
// 2. DÉSACTIVATION TRIALS EXPIRÉS
// ════════════════════════════════════════════════════════════════════════════
async function deactivateExpiredTrials() {
  try {
    const now = new Date();
    const expired = await Subscription.findAll({
      where: { status:'TRIAL', [Op.or]: [
        { end_date:       { [Op.lt]: now } },
        { trial_end_date: { [Op.lt]: now } },
      ]}
    });
    for (const sub of expired) {
      await sub.update({ status:'TRIAL_EXPIRED' });
      await Clinic.update({ subscription_status:'TRIAL_EXPIRED' }, { where:{ id:sub.clinic_id } });
      log(`Trial expiré: clinic=${sub.clinic_id}`);
    }
    if (expired.length) log(`${expired.length} trial(s) expirés`);
  } catch(e) { log(`❌ deactivateTrials: ${e.message}`); }
}

// ════════════════════════════════════════════════════════════════════════════
// 3. EMAILS RAPPEL FIN DE TRIAL (J-3 et J-1)
// ════════════════════════════════════════════════════════════════════════════
async function sendTrialReminderEmails() {
  try {
    const { sendTrialReminder } = require('../utils/mailer');
    const now = new Date();

    for (const daysLeft of [3, 1]) {
      const start = new Date(now); start.setDate(start.getDate() + daysLeft); start.setHours(0,0,0,0);
      const end   = new Date(start); end.setHours(23,59,59,999);

      const trials = await Subscription.findAll({
        where: { status:'TRIAL', end_date: { [Op.between]: [start, end] } }
      });

      for (const sub of trials) {
        try {
          const clinic = await Clinic.findByPk(sub.clinic_id);
          if (clinic?.email) {
            await sendTrialReminder(clinic.email, clinic.name, daysLeft, sub.plan);
            log(`📧 Rappel J-${daysLeft} → ${clinic.email}`);
          }
        } catch(e) { log(`⚠️ Rappel email non-fatal: ${e.message}`); }
      }

      log(`Rappels J-${daysLeft}: ${trials.length} envoyé(s)`);
    }
  } catch(e) { log(`❌ sendTrialReminders: ${e.message}`); }
}

// ════════════════════════════════════════════════════════════════════════════
// 4. ACTIVATION ABONNEMENT APRÈS PAIEMENT
// ════════════════════════════════════════════════════════════════════════════
async function activateSubscriptionAfterPayment(clinicId, planCode, paymentRequestId) {
  try {
    const now     = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + PLAN_DAYS);

    await Subscription.update(
      { status:'SUPERSEDED' },
      { where: { clinic_id:clinicId, status:{ [Op.in]:['ACTIVE','TRIAL','EXPIRED','TRIAL_EXPIRED'] } } }
    );

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

    await Clinic.update(
      { subscription_status:'ACTIVE', current_plan: planCode || 'PRO' },
      { where: { id: clinicId } }
    );

    // Email de confirmation
    try {
      const { sendSubscriptionActivated } = require('../utils/mailer');
      const clinic = await Clinic.findByPk(clinicId);
      if (clinic?.email) await sendSubscriptionActivated(clinic.email, clinic.name, planCode, endDate);
    } catch(e) { log(`⚠️ Email activation non-fatal: ${e.message}`); }

    log(`✅ Abonnement activé: clinic=${clinicId} plan=${planCode} end=${endDate.toDateString()}`);
    return { success:true, subscription:newSub };
  } catch(e) {
    log(`❌ activateSubscription: ${e.message}`);
    return { success:false, error:e.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 5. DÉMARRAGE DES CRONS
// ════════════════════════════════════════════════════════════════════════════
function startSubscriptionCron() {
  log('🚀 Démarrage des Cron Jobs DentalPM');

  // Toutes les heures → vérification expiration
  cron.schedule('0 * * * *', async () => {
    log('── Cron horaire ──');
    await deactivateExpiredSubscriptions();
    await deactivateExpiredTrials();
  }, { timezone: 'Indian/Antananarivo' });

  // Tous les jours à 08h00 → rappels fin de trial
  cron.schedule('0 8 * * *', async () => {
    log('── Cron 08h00 — Rappels trial ──');
    await sendTrialReminderEmails();
  }, { timezone: 'Indian/Antananarivo' });

  // Exécution immédiate au démarrage
  (async () => {
    await deactivateExpiredSubscriptions();
    await deactivateExpiredTrials();
  })();

  log('✅ Crons actifs: horaire (expiration) + 08h00 (rappels email)');
}

module.exports = {
  startSubscriptionCron,
  activateSubscriptionAfterPayment,
  deactivateExpiredSubscriptions,
  deactivateExpiredTrials,
  sendTrialReminderEmails,
  PLAN_PRICES,
  PLAN_DAYS,
};
