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

// ✅ requireValidSubscription — NE BLOQUE JAMAIS
// La verification abonnement est geree cote frontend (LicensingGuard)
const requireValidSubscription = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || user.role === 'SUPER_ADMIN') return next();
    const clinicId = req.clinic_id || user?.clinic_id || user?.dataValues?.clinic_id;
    if (clinicId) {
      try {
        const sub = await Subscription.findOne({ where: { clinic_id: clinicId }, order: [['created_at','DESC']] });
        if (sub) req.subscription = sub;
      } catch(e) { console.warn('Subscription lookup non-fatal:', e.message); }
    }
    next();
  } catch (error) {
    console.error('License check non-fatal:', error.message);
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
