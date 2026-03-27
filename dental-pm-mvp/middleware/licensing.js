const { Subscription, User } = require('../models');
const { Op } = require('sequelize');

const PLAN_FEATURES = {
  ESSENTIAL: ['patients','appointments','invoicing','basic_reports'],
  PRO: ['patients','appointments','invoicing','inventory','lab_orders','patient_mailing','advanced_reports','basic_reports'],
  GROUP: ['patients','appointments','invoicing','inventory','lab_orders','patient_mailing','advanced_reports','basic_reports','multi_site','api_access','custom_integrations']
};

// ✅ Max praticiens par plan (depuis getPlanConfig)
const PLAN_MAX_USERS = {
  ESSENTIAL: 3,
  PRO: 10,
  GROUP: 50
};

const requireValidSubscription = async (req, res, next) => {
  try {
    const { user } = req;

    // Super admin bypass
    if (user.role === 'SUPER_ADMIN') return next();

    // Doit avoir une clinique
    if (!user.clinic_id) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Aucune clinique associée à votre compte',
        code: 'NO_CLINIC'
      });
    }

    // Chercher abonnement actif
    const subscription = await Subscription.findOne({
      where: {
        clinic_id: user.clinic_id,
        status: { [Op.in]: ['ACTIVE', 'TRIAL'] }
      },
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      return res.status(403).json({
        error: 'Abonnement requis',
        message: 'Aucun abonnement actif. Veuillez souscrire pour accéder au service.',
        code: 'NO_ACTIVE_SUBSCRIPTION',
        action: 'subscribe'
      });
    }

    // Vérifier expiration
    const now = new Date();
    if (subscription.end_date && new Date(subscription.end_date) < now) {
      await subscription.update({ status: 'EXPIRED' });
      return res.status(403).json({
        error: 'Abonnement expiré',
        message: 'Votre abonnement a expiré. Renouvelez pour continuer.',
        code: 'SUBSCRIPTION_EXPIRED',
        action: 'renew',
        expired_date: subscription.end_date
      });
    }

    req.subscription = subscription;
    next();
  } catch (error) {
    console.error('License check error:', error);
    // ✅ En cas d'erreur on laisse passer pour ne pas bloquer
    next();
  }
};

const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const { user, subscription } = req;
      if (user.role === 'SUPER_ADMIN') return next();
      if (!subscription) return res.status(403).json({ error:'Abonnement requis', code:'NO_SUBSCRIPTION' });

      const planFeatures = PLAN_FEATURES[subscription.plan] || [];
      if (!planFeatures.includes(featureName)) {
        return res.status(403).json({
          error: 'Fonctionnalité non disponible',
          message: `Non disponible dans le plan ${subscription.plan}.`,
          code: 'FEATURE_NOT_AVAILABLE',
          current_plan: subscription.plan,
          feature: featureName
        });
      }
      next();
    } catch (error) {
      console.error('Feature check error:', error);
      next();
    }
  };
};

const checkPractitionerLimit = async (req, res, next) => {
  try {
    const { user, subscription } = req;
    if (user.role === 'SUPER_ADMIN') return next();
    if (!subscription) return res.status(403).json({ error:'Abonnement requis', code:'NO_SUBSCRIPTION' });

    const practitionerCount = await User.count({
      where: { clinic_id: user.clinic_id, role: { [Op.in]: ['ADMIN','DENTIST'] }, is_active: true }
    });

    // ✅ Utiliser PLAN_MAX_USERS au lieu de subscription.max_practitioners
    const maxAllowed = PLAN_MAX_USERS[subscription.plan] || 3;

    if (practitionerCount >= maxAllowed) {
      return res.status(403).json({
        error: 'Limite de praticiens atteinte',
        message: `Plan ${subscription.plan}: max ${maxAllowed} praticiens.`,
        code: 'PRACTITIONER_LIMIT_REACHED',
        current_count: practitionerCount,
        max_allowed: maxAllowed
      });
    }
    next();
  } catch (error) {
    console.error('Practitioner limit error:', error);
    next();
  }
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const { user } = req;

    if (user.role === 'SUPER_ADMIN') {
      return res.json({ status:'SUPER_ADMIN', unlimited_access:true });
    }

    if (!user.clinic_id) {
      return res.json({ status:'NO_CLINIC', has_access:false });
    }

    const subscription = await Subscription.findOne({
      where: { clinic_id: user.clinic_id },
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      return res.json({ status:'NO_SUBSCRIPTION', has_access:false });
    }

    const now = new Date();
    const is_expired = subscription.end_date && new Date(subscription.end_date) < now;

    // ✅ trial_days_remaining basé sur end_date si TRIAL
    let trial_days_remaining = null;
    if (subscription.status === 'TRIAL') {
      const endDate = new Date(subscription.end_date);
      const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      trial_days_remaining = Math.max(0, diffDays);
    }

    return res.json({
      status:               subscription.status,
      plan:                 subscription.plan,
      has_access:           ['ACTIVE','TRIAL'].includes(subscription.status) && !is_expired,
      is_trial:             subscription.status === 'TRIAL',
      is_expired,
      trial_days_remaining,
      end_date:             subscription.end_date,
      features:             PLAN_FEATURES[subscription.plan] || [],
      // ✅ max_practitioners depuis PLAN_MAX_USERS
      max_practitioners:    PLAN_MAX_USERS[subscription.plan] || 3,
      subscription_id:      subscription.id
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error:'Erreur statut abonnement' });
  }
};

module.exports = { requireValidSubscription, requireFeature, checkPractitionerLimit, getSubscriptionStatus, PLAN_FEATURES };
