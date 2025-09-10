const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { requireRole } = require('../middleware/auth');
const { Clinic, Subscription, SubscriptionInvoice, User } = require('../models');
const { Op } = require('sequelize');

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = {
  ESSENTIAL: {
    name: 'Essential',
    description: '1-2 praticiens',
    max_practitioners: 2,
    price_mga: 180000, // 180,000 MGA/month
    features: [
      'Gestion patients',
      'Rendez-vous',
      'Facturation MGA',
      'Support par email'
    ]
  },
  PRO: {
    name: 'Pro',
    description: '2-4 praticiens',
    max_practitioners: 4,
    price_mga: 390000, // 390,000 MGA/month
    features: [
      'Toutes les fonctionnalités Essential',
      'Inventaire avancé',
      'Laboratoire dentaire',
      'Mailing patients',
      'Rapports avancés',
      'Support prioritaire'
    ]
  },
  GROUP: {
    name: 'Group',
    description: '5+ praticiens',
    max_practitioners: 999,
    price_mga: 790000, // 790,000 MGA/month
    features: [
      'Toutes les fonctionnalités Pro',
      'Multi-site',
      'API access',
      'Formation personnalisée',
      'Support dédié 24/7'
    ]
  }
};

// Discount Configurations
const DISCOUNTS = {
  SYNDICAL: 0.15, // -15%
  HUMANITARIAN: 0.20, // -20%
  LONG_TERM: 0.10 // -10% for 24-month commitment
};

/**
 * @route GET /api/subscriptions/plans
 * @desc Get available subscription plans
 * @access Public
 */
router.get('/plans', (req, res) => {
  res.json({
    plans: SUBSCRIPTION_PLANS,
    discounts: {
      syndical: { name: 'Syndical', percentage: 15, description: 'Remise pour membres syndicaux' },
      humanitarian: { name: 'Humanitaire/Rural', percentage: 20, description: 'Remise pour ONG et zones rurales' },
      long_term: { name: 'Engagement 24 mois', percentage: 10, description: 'Remise pour engagement long terme' }
    }
  });
});

/**
 * @route POST /api/subscriptions
 * @desc Create a new subscription for a clinic
 * @access Super Admin
 */
router.post('/', [
  requireRole('SUPER_ADMIN'),
  body('clinic_id').isUUID().withMessage('Clinic ID invalide'),
  body('plan').isIn(['ESSENTIAL', 'PRO', 'GROUP']).withMessage('Plan invalide'),
  body('billing_cycle').isIn(['MONTHLY', 'ANNUAL']).withMessage('Cycle de facturation invalide'),
  body('discount_type').optional().isIn(['SYNDICAL', 'HUMANITARIAN', 'LONG_TERM']).withMessage('Type de remise invalide'),
  body('start_date').isISO8601().withMessage('Date de début invalide'),
  body('auto_renew').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { clinic_id, plan, billing_cycle, discount_type, start_date, auto_renew = true } = req.body;

    // Verify clinic exists
    const clinic = await Clinic.findByPk(clinic_id);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinique introuvable' });
    }

    // Check if clinic already has an active subscription
    const existingSubscription = await Subscription.findOne({
      where: {
        clinic_id,
        status: { [Op.in]: ['ACTIVE', 'TRIAL'] }
      }
    });

    if (existingSubscription) {
      return res.status(400).json({ 
        error: 'Cette clinique a déjà un abonnement actif' 
      });
    }

    // Calculate pricing
    const planConfig = SUBSCRIPTION_PLANS[plan];
    let monthly_price_mga = planConfig.price_mga;
    let discount_percentage = 0;

    if (discount_type && DISCOUNTS[discount_type]) {
      discount_percentage = DISCOUNTS[discount_type] * 100;
      monthly_price_mga = monthly_price_mga * (1 - DISCOUNTS[discount_type]);
    }

    // Calculate end date
    const startDate = new Date(start_date);
    const endDate = new Date(startDate);
    if (billing_cycle === 'ANNUAL') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create subscription
    const subscription = await Subscription.create({
      clinic_id,
      plan,
      status: 'ACTIVE',
      billing_cycle,
      monthly_price_mga,
      annual_price_mga: monthly_price_mga * 12,
      discount_type,
      discount_percentage,
      start_date: startDate,
      end_date: endDate,
      auto_renew,
      max_practitioners: planConfig.max_practitioners,
      features: planConfig.features
    });

    res.status(201).json({
      message: 'Abonnement créé avec succès',
      subscription: {
        ...subscription.toJSON(),
        plan_details: planConfig
      }
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de l\'abonnement'
    });
  }
});

/**
 * @route POST /api/subscriptions/trial
 * @desc Start trial subscription for a clinic
 * @access Super Admin or during clinic registration
 */
router.post('/trial', [
  body('clinic_id').isUUID().withMessage('Clinic ID invalide'),
  body('plan').optional().isIn(['ESSENTIAL', 'PRO', 'GROUP']).withMessage('Plan invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { clinic_id, plan = 'ESSENTIAL' } = req.body;

    // Verify clinic exists
    const clinic = await Clinic.findByPk(clinic_id);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinique introuvable' });
    }

    // Check if clinic already had a trial
    const existingTrial = await Subscription.findOne({
      where: {
        clinic_id,
        status: { [Op.in]: ['TRIAL', 'TRIAL_EXPIRED'] }
      }
    });

    if (existingTrial) {
      return res.status(400).json({ 
        error: 'Cette clinique a déjà utilisé sa période d\'essai' 
      });
    }

    const planConfig = SUBSCRIPTION_PLANS[plan];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14); // 14 days trial

    // Create trial subscription
    const subscription = await Subscription.create({
      clinic_id,
      plan,
      status: 'TRIAL',
      billing_cycle: 'MONTHLY',
      monthly_price_mga: 0, // Free trial
      annual_price_mga: 0,
      start_date: startDate,
      end_date: endDate,
      trial_end_date: endDate,
      auto_renew: false,
      max_practitioners: planConfig.max_practitioners,
      features: planConfig.features
    });

    res.status(201).json({
      message: 'Période d\'essai démarrée avec succès',
      subscription: {
        ...subscription.toJSON(),
        plan_details: planConfig,
        trial_days_remaining: 14
      }
    });

  } catch (error) {
    console.error('Start trial error:', error);
    res.status(500).json({
      error: 'Erreur lors du démarrage de la période d\'essai'
    });
  }
});

/**
 * @route GET /api/subscriptions
 * @desc Get all subscriptions (Super Admin) or current clinic subscription
 * @access Super Admin or Authenticated User
 */
router.get('/', async (req, res) => {
  try {
    const { user } = req;
    let subscriptions;

    if (user.role === 'SUPER_ADMIN') {
      // Super admin sees all subscriptions
      const { page = 1, limit = 20, status, plan } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = {};
      if (status) whereClause.status = status;
      if (plan) whereClause.plan = plan;

      const { count, rows } = await Subscription.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Clinic,
            attributes: ['id', 'name', 'city', 'contact_email']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      return res.json({
        subscriptions: rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_count: count,
          per_page: parseInt(limit)
        }
      });
    } else {
      // Regular users see only their clinic's subscription
      if (!user.clinic_id) {
        return res.status(404).json({ error: 'Aucun abonnement trouvé' });
      }

      const subscription = await Subscription.findOne({
        where: { clinic_id: user.clinic_id },
        include: [
          {
            model: Clinic,
            attributes: ['id', 'name', 'city']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Aucun abonnement trouvé' });
      }

      // Calculate days remaining for trial
      let trial_days_remaining = null;
      if (subscription.status === 'TRIAL' && subscription.trial_end_date) {
        const now = new Date();
        const trialEnd = new Date(subscription.trial_end_date);
        const diffTime = trialEnd.getTime() - now.getTime();
        trial_days_remaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      return res.json({
        subscription: {
          ...subscription.toJSON(),
          plan_details: SUBSCRIPTION_PLANS[subscription.plan],
          trial_days_remaining
        }
      });
    }

  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des abonnements'
    });
  }
});

/**
 * @route PUT /api/subscriptions/:id
 * @desc Update subscription
 * @access Super Admin
 */
router.put('/:id', [
  requireRole(['SUPER_ADMIN']),
  param('id').isUUID().withMessage('ID abonnement invalide'),
  body('plan').optional().isIn(['ESSENTIAL', 'PRO', 'GROUP']),
  body('status').optional().isIn(['ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED', 'TRIAL_EXPIRED']),
  body('auto_renew').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const subscription = await Subscription.findByPk(id);
    if (!subscription) {
      return res.status(404).json({ error: 'Abonnement introuvable' });
    }

    // If changing plan, update pricing
    if (updates.plan && updates.plan !== subscription.plan) {
      const planConfig = SUBSCRIPTION_PLANS[updates.plan];
      let monthly_price = planConfig.price_mga;
      
      // Apply existing discount
      if (subscription.discount_type && DISCOUNTS[subscription.discount_type]) {
        monthly_price = monthly_price * (1 - DISCOUNTS[subscription.discount_type]);
      }
      
      updates.monthly_price_mga = monthly_price;
      updates.annual_price_mga = monthly_price * 12;
      updates.max_practitioners = planConfig.max_practitioners;
      updates.features = planConfig.features;
    }

    await subscription.update(updates);

    res.json({
      message: 'Abonnement mis à jour avec succès',
      subscription: {
        ...subscription.toJSON(),
        plan_details: SUBSCRIPTION_PLANS[subscription.plan]
      }
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour de l\'abonnement'
    });
  }
});

/**
 * @route POST /api/subscriptions/:id/cancel
 * @desc Cancel subscription
 * @access Super Admin or Clinic Admin
 */
router.post('/:id/cancel', [
  param('id').isUUID().withMessage('ID abonnement invalide'),
  body('reason').optional().isLength({ min: 1, max: 255 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const { user } = req;

    const subscription = await Subscription.findByPk(id);
    if (!subscription) {
      return res.status(404).json({ error: 'Abonnement introuvable' });
    }

    // Check permissions
    if (user.role !== 'SUPER_ADMIN' && user.clinic_id !== subscription.clinic_id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await subscription.update({
      status: 'CANCELLED',
      cancelled_at: new Date(),
      cancellation_reason: reason || 'Annulation demandée'
    });

    res.json({
      message: 'Abonnement annulé avec succès',
      subscription
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'annulation de l\'abonnement'
    });
  }
});

module.exports = router;