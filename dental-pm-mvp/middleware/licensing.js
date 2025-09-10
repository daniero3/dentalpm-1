const { Subscription, User } = require('../models');
const { Op } = require('sequelize');

// Feature mapping based on subscription plans
const PLAN_FEATURES = {
  ESSENTIAL: [
    'patients',
    'appointments', 
    'invoicing',
    'basic_reports'
  ],
  PRO: [
    'patients',
    'appointments',
    'invoicing', 
    'inventory',
    'lab_orders',
    'patient_mailing',
    'advanced_reports',
    'basic_reports'
  ],
  GROUP: [
    'patients',
    'appointments',
    'invoicing',
    'inventory', 
    'lab_orders',
    'patient_mailing',
    'advanced_reports',
    'basic_reports',
    'multi_site',
    'api_access',
    'custom_integrations'
  ]
};

/**
 * Middleware to check if user's clinic has valid subscription
 */
const requireValidSubscription = async (req, res, next) => {
  try {
    const { user } = req;
    
    // Super admin bypasses all licensing checks
    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    // User must belong to a clinic
    if (!user.clinic_id) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Aucune clinique associée à votre compte',
        code: 'NO_CLINIC'
      });
    }

    // Find active subscription for user's clinic
    const subscription = await Subscription.findOne({
      where: {
        clinic_id: user.clinic_id,
        status: { [Op.in]: ['ACTIVE', 'TRIAL'] }
      }
    });

    if (!subscription) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Aucun abonnement actif trouvé. Veuillez contacter votre administrateur.',
        code: 'NO_ACTIVE_SUBSCRIPTION'
      });
    }

    // Check if subscription is expired
    const now = new Date();
    if (subscription.end_date && new Date(subscription.end_date) < now) {
      // Update subscription status to expired
      await subscription.update({ status: 'EXPIRED' });
      
      return res.status(403).json({
        error: 'Abonnement expiré',
        message: 'Votre abonnement a expiré. Veuillez le renouveler pour continuer à utiliser le service.',
        code: 'SUBSCRIPTION_EXPIRED',
        expired_date: subscription.end_date
      });
    }

    // Check trial expiration
    if (subscription.status === 'TRIAL' && subscription.trial_end_date) {
      if (new Date(subscription.trial_end_date) < now) {
        await subscription.update({ status: 'TRIAL_EXPIRED' });
        
        return res.status(403).json({
          error: 'Période d\'essai expirée',
          message: 'Votre période d\'essai de 14 jours a expiré. Veuillez souscrire à un abonnement pour continuer.',
          code: 'TRIAL_EXPIRED',
          trial_end_date: subscription.trial_end_date
        });
      }
    }

    // Attach subscription info to request for further use
    req.subscription = subscription;
    next();

  } catch (error) {
    console.error('License check error:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification de la licence'
    });
  }
};

/**
 * Middleware to check if a specific feature is available in current plan
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const { user, subscription } = req;
      
      // Super admin bypasses feature restrictions
      if (user.role === 'SUPER_ADMIN') {
        return next();
      }

      // Must have valid subscription first
      if (!subscription) {
        return res.status(403).json({
          error: 'Accès refusé',
          message: 'Abonnement requis pour accéder à cette fonctionnalité',
          code: 'NO_SUBSCRIPTION'
        });
      }

      const planFeatures = PLAN_FEATURES[subscription.plan] || [];
      
      if (!planFeatures.includes(featureName)) {
        const requiredPlans = [];
        for (const [plan, features] of Object.entries(PLAN_FEATURES)) {
          if (features.includes(featureName)) {
            requiredPlans.push(plan);
          }
        }

        return res.status(403).json({
          error: 'Fonctionnalité non disponible',
          message: `Cette fonctionnalité n'est pas disponible dans votre plan ${subscription.plan}. Mise à niveau requise.`,
          code: 'FEATURE_NOT_AVAILABLE',
          current_plan: subscription.plan,
          required_plans: requiredPlans,
          feature: featureName
        });
      }

      next();

    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification de la fonctionnalité'
      });
    }
  };
};

/**
 * Middleware to check practitioner limits
 */
const checkPractitionerLimit = async (req, res, next) => {
  try {
    const { user, subscription } = req;
    
    // Super admin bypasses limits
    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!subscription) {
      return res.status(403).json({
        error: 'Abonnement requis',
        code: 'NO_SUBSCRIPTION'
      });
    }

    // Count current practitioners in clinic
    const practitionerCount = await User.count({
      where: {
        clinic_id: user.clinic_id,
        role: { [Op.in]: ['ADMIN', 'DENTIST'] },
        is_active: true
      }
    });

    if (practitionerCount >= subscription.max_practitioners) {
      return res.status(403).json({
        error: 'Limite de praticiens atteinte',
        message: `Votre plan ${subscription.plan} autorise jusqu'à ${subscription.max_practitioners} praticiens. Vous en avez actuellement ${practitionerCount}.`,
        code: 'PRACTITIONER_LIMIT_REACHED',
        current_count: practitionerCount,
        max_allowed: subscription.max_practitioners,
        plan: subscription.plan
      });
    }

    next();

  } catch (error) {
    console.error('Practitioner limit check error:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification des limites'
    });
  }
};

/**
 * Get subscription status for frontend
 */
const getSubscriptionStatus = async (req, res) => {
  try {
    const { user } = req;
    
    if (user.role === 'SUPER_ADMIN') {
      return res.json({
        status: 'SUPER_ADMIN',
        unlimited_access: true
      });
    }

    if (!user.clinic_id) {
      return res.json({
        status: 'NO_CLINIC',
        has_access: false,
        message: 'Aucune clinique associée'
      });
    }

    const subscription = await Subscription.findOne({
      where: {
        clinic_id: user.clinic_id
      },
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      return res.json({
        status: 'NO_SUBSCRIPTION',
        has_access: false,
        message: 'Aucun abonnement trouvé'
      });
    }

    // Calculate trial days remaining
    let trial_days_remaining = null;
    if (subscription.status === 'TRIAL' && subscription.trial_end_date) {
      const now = new Date();
      const trialEnd = new Date(subscription.trial_end_date);
      const diffTime = trialEnd.getTime() - now.getTime();
      trial_days_remaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Check if expired
    const now = new Date();
    let is_expired = false;
    if (subscription.end_date && new Date(subscription.end_date) < now) {
      is_expired = true;
    }

    res.json({
      status: subscription.status,
      plan: subscription.plan,
      has_access: ['ACTIVE', 'TRIAL'].includes(subscription.status) && !is_expired,
      is_trial: subscription.status === 'TRIAL',
      is_expired,
      trial_days_remaining,
      end_date: subscription.end_date,
      features: PLAN_FEATURES[subscription.plan] || [],
      max_practitioners: subscription.max_practitioners,
      subscription_id: subscription.id
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du statut d\'abonnement'
    });
  }
};

module.exports = {
  requireValidSubscription,
  requireFeature,
  checkPractitionerLimit,
  getSubscriptionStatus,
  PLAN_FEATURES
};