const { Subscription, User } = require('../models');
const { Op } = require('sequelize');

const PLAN_FEATURES = {
  ESSENTIAL: ['patients','appointments','invoicing','basic_reports'],
  PRO:       ['patients','appointments','invoicing','inventory','lab_orders','patient_mailing','advanced_reports','basic_reports'],
  GROUP:     ['patients','appointments','invoicing','inventory','lab_orders','patient_mailing','advanced_reports','basic_reports','multi_site','api_access']
};

const PLAN_MAX_USERS = { ESSENTIAL: 2, PRO: 5, GROUP: 50 };

// ✅ JAMAIS BLOQUANT — attache juste les infos subscription à req
const requireValidSubscription = async (req, res, next) => {
  try {
    if (!req.user || req.user.role === 'SUPER_ADMIN') return next();
    const clinicId = req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id;
    if (clinicId) {
      try {
        const sub = await Subscription.findOne({
          where: { clinic_id: clinicId },
          order: [['created_at','DESC']]
        });
        if (sub) req.subscription = sub;
      } catch(e) { console.warn('Subscription lookup (non-fatal):', e.message); }
    }
    next(); // TOUJOURS next()
  } catch(e) {
    console.error('License check (non-fatal):', e.message);
    next(); // TOUJOURS next()
  }
};

const requireFeature = (featureName) => async (req, res, next) => {
  try {
    if (!req.user || req.user.role === 'SUPER_ADMIN') return next();
    // Non-bloquant si pas de subscription
    if (!req.subscription) return next();
    const features = PLAN_FEATURES[req.subscription.plan] || [];
    if (!features.includes(featureName)) {
      return res.status(403).json({
        error: 'Fonctionnalité non disponible',
        code: 'FEATURE_NOT_AVAILABLE',
        current_plan: req.subscription.plan,
        feature: featureName
      });
    }
    next();
  } catch(e) { next(); }
};

const checkPractitionerLimit = async (req, res, next) => {
  try {
    if (!req.user || req.user.role === 'SUPER_ADMIN') return next();
    if (!req.subscription) return next();
    const clinicId = req.clinic_id || req.user?.clinic_id;
    if (!clinicId) return next();
    const count = await User.count({
      where: { clinic_id: clinicId, role: { [Op.in]: ['ADMIN','DENTIST'] }, is_active: true }
    });
    const max = PLAN_MAX_USERS[req.subscription.plan] || 10;
    if (count >= max) {
      return res.status(403).json({
        error: 'Limite de praticiens atteinte',
        code: 'PRACTITIONER_LIMIT_REACHED',
        current_count: count,
        max_allowed: max
      });
    }
    next();
  } catch(e) { next(); }
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Non authentifié' });

    if (user.role === 'SUPER_ADMIN') {
      return res.json({ status:'SUPER_ADMIN', unlimited_access: true, has_access: true });
    }

    const clinicId = req.clinic_id || user?.clinic_id || user?.dataValues?.clinic_id;
    if (!clinicId) {
      return res.json({ status:'NO_CLINIC', has_access: false });
    }

    const subscription = await Subscription.findOne({
      where: { clinic_id: clinicId },
      order: [['created_at','DESC']]
    });

    if (!subscription) {
      return res.json({ status:'NO_SUBSCRIPTION', has_access: false });
    }

    const now        = new Date();
    const is_expired = subscription.end_date && new Date(subscription.end_date) < now;
    let trial_days_remaining = null;
    if (subscription.status === 'TRIAL') {
      const diff = new Date(subscription.end_date) - now;
      trial_days_remaining = Math.max(0, Math.ceil(diff / (1000*60*60*24)));
    }

    return res.json({
      status:              subscription.status,
      plan:                subscription.plan,
      has_access:          ['ACTIVE','TRIAL'].includes(subscription.status) && !is_expired,
      is_trial:            subscription.status === 'TRIAL',
      is_expired,
      trial_days_remaining,
      end_date:            subscription.end_date,
      features:            PLAN_FEATURES[subscription.plan] || [],
      max_practitioners:   PLAN_MAX_USERS[subscription.plan] || 3,
      subscription_id:     subscription.id
    });
  } catch(error) {
    console.error('Subscription status error:', error.message);
    return res.status(500).json({ error:'Erreur statut abonnement' });
  }
};

module.exports = { requireValidSubscription, requireFeature, checkPractitionerLimit, getSubscriptionStatus, PLAN_FEATURES };
