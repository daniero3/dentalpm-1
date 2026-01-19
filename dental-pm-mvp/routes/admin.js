const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { requireRole } = require('../middleware/auth');
const { Clinic, Subscription, SubscriptionInvoice, User, PaymentRequest } = require('../models');
const { Op } = require('sequelize');

/**
 * @route GET /api/admin/dashboard
 * @desc Get super admin dashboard data
 * @access Super Admin
 */
router.get('/dashboard', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get comprehensive stats
    const [
      totalClinics,
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      expiredSubscriptions,
      monthlyRevenue,
      yearlyRevenue,
      totalUsers
    ] = await Promise.all([
      // Total clinics
      Clinic.count(),
      
      // Total subscriptions
      Subscription.count(),
      
      // Active subscriptions
      Subscription.count({ where: { status: 'ACTIVE' } }),
      
      // Trial subscriptions
      Subscription.count({ where: { status: 'TRIAL' } }),
      
      // Expired subscriptions
      Subscription.count({ where: { status: { [Op.in]: ['EXPIRED', 'TRIAL_EXPIRED'] } } }),
      
      // Monthly revenue
      SubscriptionInvoice.sum('total_mga', {
        where: {
          status: 'PAID',
          paid_at: { [Op.gte]: startOfMonth }
        }
      }) || 0,
      
      // Yearly revenue
      SubscriptionInvoice.sum('total_mga', {
        where: {
          status: 'PAID',
          paid_at: { [Op.gte]: startOfYear }
        }
      }) || 0,
      
      // Total users across all clinics
      User.count({ where: { role: { [Op.ne]: 'SUPER_ADMIN' } } })
    ]);

    // Get simple recent data
    const recentClinics = await Clinic.findAll({
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    const recentInvoices = await SubscriptionInvoice.findAll({
      limit: 10,
      order: [['created_at', 'DESC']]
    });

    const subscriptionsByPlan = await Subscription.findAll({
      attributes: [
        'plan',
        'status',
        [Subscription.sequelize.fn('COUNT', Subscription.sequelize.col('id')), 'count']
      ],
      group: ['plan', 'status'],
      raw: true
    });

    res.json({
      stats: {
        clinics: {
          total: totalClinics,
          active: activeSubscriptions, // Using active subscriptions as proxy for active clinics
          growth_rate: 0 // TODO: Calculate month-over-month growth
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          trial: trialSubscriptions,
          expired: expiredSubscriptions
        },
        revenue: {
          monthly_mga: monthlyRevenue,
          yearly_mga: yearlyRevenue
        },
        users: {
          total: totalUsers
        }
      },
      recent_clinics: recentClinics,
      subscriptions_by_plan: subscriptionsByPlan,
      recent_invoices: recentInvoices
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des données du tableau de bord'
    });
  }
});

/**
 * @route GET /api/admin/clinics
 * @desc Get all clinics with pagination
 * @access Super Admin
 */
router.get('/clinics', [
  requireRole('SUPER_ADMIN'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { city: { [Op.like]: `%${search}%` } },
          { contact_email: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const { count, rows: clinics } = await Clinic.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Subscription,
          as: 'subscriptions',
          attributes: ['id', 'plan', 'status', 'end_date', 'price_mga'],
          order: [['created_at', 'DESC']],
          limit: 1
        },
        {
          model: User,
          as: 'users',
          attributes: ['id', 'role'],
          where: { is_active: true },
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // Add user count and latest subscription info
    const enrichedClinics = clinics.map(clinic => {
      const clinicData = clinic.toJSON();
      clinicData.user_count = clinicData.users ? clinicData.users.length : 0;
      clinicData.latest_subscription = clinicData.subscriptions && clinicData.subscriptions.length > 0 
        ? clinicData.subscriptions[0] 
        : null;
      
      delete clinicData.users;
      delete clinicData.subscriptions;
      
      return clinicData;
    });

    res.json({
      clinics: enrichedClinics,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get clinics error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des cliniques'
    });
  }
});

/**
 * @route POST /api/admin/clinics
 * @desc Create new clinic
 * @access Super Admin
 */
router.post('/clinics', [
  requireRole('SUPER_ADMIN'),
  body('name').isLength({ min: 2, max: 100 }).withMessage('Nom requis (2-100 caractères)'),
  body('address').isLength({ min: 5, max: 255 }).withMessage('Adresse requise'),
  body('city').isLength({ min: 2, max: 50 }).withMessage('Ville requise'),
  body('postal_code').optional().isLength({ max: 10 }),
  body('email').isEmail().withMessage('Email valide requis'),
  body('nif_number').optional().isLength({ min: 5, max: 20 }),
  body('stat_number').optional().isLength({ min: 5, max: 20 }),
  body('admin_user').isObject().withMessage('Informations administrateur requises'),
  body('admin_user.username').isLength({ min: 3, max: 50 }),
  body('admin_user.email').isEmail(),
  body('admin_user.password').isLength({ min: 6 }),
  body('admin_user.first_name').isLength({ min: 2, max: 50 }),
  body('admin_user.last_name').isLength({ min: 2, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { admin_user, ...clinicData } = req.body;

    // Check if clinic name already exists
    const existingClinic = await Clinic.findOne({
      where: { name: clinicData.name }
    });

    if (existingClinic) {
      return res.status(400).json({
        error: 'Une clinique avec ce nom existe déjà'
      });
    }

    // Check if admin email already exists
    const existingUser = await User.findOne({
      where: { email: admin_user.email }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Create clinic
    const clinic = await Clinic.create({
      ...clinicData,
      is_active: true
    });

    // Create admin user for the clinic
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(admin_user.password, 10);

    const adminUser = await User.create({
      username: admin_user.username,
      email: admin_user.email,
      password_hash: hashedPassword,
      full_name: `${admin_user.first_name} ${admin_user.last_name}`,
      role: 'ADMIN',
      clinic_id: clinic.id,
      is_active: true
    });

    // Start trial subscription automatically
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const trialSubscription = await Subscription.create({
      clinic_id: clinic.id,
      plan: 'ESSENTIAL',
      status: 'TRIAL',
      billing_cycle: 'MONTHLY',
      monthly_price_mga: 0,
      annual_price_mga: 0,
      start_date: new Date(),
      end_date: trialEndDate,
      trial_end_date: trialEndDate,
      auto_renew: false,
      max_practitioners: 2,
      features: ['patients', 'appointments', 'invoicing', 'basic_reports']
    });

    res.status(201).json({
      message: 'Clinique créée avec succès',
      clinic: {
        ...clinic.toJSON(),
        admin_user: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          first_name: adminUser.first_name,
          last_name: adminUser.last_name
        },
        trial_subscription: trialSubscription
      }
    });

  } catch (error) {
    console.error('Create clinic error:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la clinique'
    });
  }
});

/**
 * @route PUT /api/admin/clinics/:id
 * @desc Update clinic
 * @access Super Admin
 */
router.put('/clinics/:id', [
  requireRole('SUPER_ADMIN'),
  param('id').isUUID().withMessage('ID clinique invalide'),
  body('name').optional().isLength({ min: 2, max: 100 }),
  body('is_active').optional().isBoolean()
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

    const clinic = await Clinic.findByPk(id);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinique introuvable' });
    }

    await clinic.update(updates);

    res.json({
      message: 'Clinique mise à jour avec succès',
      clinic
    });

  } catch (error) {
    console.error('Update clinic error:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour de la clinique'
    });
  }
});

/**
 * @route GET /api/admin/users
 * @desc Get all users (Super Admin)
 * @access Super Admin
 */
router.get('/users', [
  requireRole('SUPER_ADMIN'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { page = 1, limit = 20, clinic_id, role } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (clinic_id) whereClause.clinic_id = clinic_id;
    if (role) whereClause.role = role;

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [{
        model: Clinic,
        as: 'clinic',
        attributes: ['id', 'name', 'city']
      }],
      attributes: { exclude: ['password_hash'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      users,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des utilisateurs'
    });
  }
});

/**
 * @route DELETE /api/admin/clinics/:id
 * @desc Deactivate clinic
 * @access Super Admin
 */
router.delete('/clinics/:id', [
  requireRole('SUPER_ADMIN'),
  param('id').isUUID().withMessage('ID clinique invalide')
], async (req, res) => {
  try {
    const { id } = req.params;

    const clinic = await Clinic.findByPk(id);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinique introuvable' });
    }

    // Deactivate instead of deleting
    await clinic.update({ is_active: false });

    // Cancel active subscriptions
    await Subscription.update(
      { status: 'CANCELLED', cancelled_at: new Date() },
      { where: { clinic_id: id, status: { [Op.in]: ['ACTIVE', 'TRIAL'] } } }
    );

    // Deactivate users
    await User.update(
      { is_active: false },
      { where: { clinic_id: id } }
    );

    res.json({
      message: 'Clinique désactivée avec succès'
    });

  } catch (error) {
    console.error('Deactivate clinic error:', error);
    res.status(500).json({
      error: 'Erreur lors de la désactivation de la clinique'
    });
  }
});

// =============================================================================
// PAYMENT REQUESTS VALIDATION (Super Admin)
// =============================================================================

// Plan pricing (MGA) - 30 days
const PLAN_PRICING = {
  ESSENTIAL: 150000,
  PRO: 300000,
  GROUP: 500000
};

/**
 * @route GET /api/admin/payment-requests
 * @desc Get all payment requests (filterable by status)
 * @access Super Admin
 */
router.get('/payment-requests', [
  requireRole('SUPER_ADMIN'),
  query('status').optional().isIn(['PENDING', 'VERIFIED', 'REJECTED'])
], async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (status) whereClause.status = status;

    const { count, rows: requests } = await PaymentRequest.findAndCountAll({
      where: whereClause,
      include: [
        { model: Clinic, as: 'clinic', attributes: ['id', 'name', 'city'] },
        { model: User, as: 'submittedBy', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'verifiedBy', attributes: ['id', 'full_name'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      paymentRequests: requests,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get payment requests error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes' });
  }
});

/**
 * @route PATCH /api/admin/payment-requests/:id/verify
 * @desc Verify payment request and activate subscription
 * @access Super Admin
 */
router.patch('/payment-requests/:id/verify', [
  requireRole('SUPER_ADMIN'),
  param('id').isUUID().withMessage('ID demande invalide'),
  body('note_admin').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { id } = req.params;
    const { note_admin } = req.body;

    const paymentRequest = await PaymentRequest.findByPk(id, {
      include: [{ model: Clinic, as: 'clinic' }]
    });

    if (!paymentRequest) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    if (paymentRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée' });
    }

    // Update payment request
    await paymentRequest.update({
      status: 'VERIFIED',
      verified_by_user_id: req.user.id,
      verified_at: new Date(),
      note_admin: note_admin || null
    });

    // Calculate subscription dates (30 days)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // Find or create subscription for clinic
    let subscription = await Subscription.findOne({
      where: { clinic_id: paymentRequest.clinic_id }
    });

    const planFeatures = {
      ESSENTIAL: { max_practitioners: 1, features: ['patients', 'appointments', 'invoicing'] },
      PRO: { max_practitioners: 3, features: ['patients', 'appointments', 'invoicing', 'reports', 'support'] },
      GROUP: { max_practitioners: 999, features: ['patients', 'appointments', 'invoicing', 'reports', 'support', 'multi_site'] }
    };

    const plan = planFeatures[paymentRequest.plan_code] || planFeatures.ESSENTIAL;

    if (subscription) {
      // Update existing subscription
      await subscription.update({
        plan: paymentRequest.plan_code,
        status: 'ACTIVE',
        billing_cycle: 'MONTHLY',
        price_mga: paymentRequest.amount_mga,
        monthly_price_mga: paymentRequest.amount_mga,
        start_date: startDate,
        end_date: endDate,
        trial_end_date: null,
        max_practitioners: plan.max_practitioners,
        features: plan.features
      });
    } else {
      // Create new subscription
      subscription = await Subscription.create({
        clinic_id: paymentRequest.clinic_id,
        plan: paymentRequest.plan_code,
        status: 'ACTIVE',
        billing_cycle: 'MONTHLY',
        price_mga: paymentRequest.amount_mga,
        monthly_price_mga: paymentRequest.amount_mga,
        annual_price_mga: paymentRequest.amount_mga * 10,
        start_date: startDate,
        end_date: endDate,
        auto_renew: false,
        max_practitioners: plan.max_practitioners,
        features: plan.features
      });
    }

    res.json({
      message: 'Paiement vérifié et abonnement activé',
      paymentRequest: {
        id: paymentRequest.id,
        status: 'VERIFIED',
        verified_at: paymentRequest.verified_at,
        note_admin: paymentRequest.note_admin
      },
      subscription: {
        id: subscription.id,
        clinic_id: subscription.clinic_id,
        plan: subscription.plan,
        status: subscription.status,
        start_date: subscription.start_date,
        end_date: subscription.end_date
      }
    });
  } catch (error) {
    console.error('Verify payment request error:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

/**
 * @route PATCH /api/admin/payment-requests/:id/reject
 * @desc Reject payment request
 * @access Super Admin
 */
router.patch('/payment-requests/:id/reject', [
  requireRole('SUPER_ADMIN'),
  param('id').isUUID().withMessage('ID demande invalide'),
  body('note_admin').notEmpty().withMessage('Motif de rejet requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { id } = req.params;
    const { note_admin } = req.body;

    const paymentRequest = await PaymentRequest.findByPk(id);

    if (!paymentRequest) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    if (paymentRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée' });
    }

    await paymentRequest.update({
      status: 'REJECTED',
      verified_by_user_id: req.user.id,
      verified_at: new Date(),
      note_admin
    });

    res.json({
      message: 'Demande de paiement rejetée',
      paymentRequest: {
        id: paymentRequest.id,
        status: 'REJECTED',
        note_admin: paymentRequest.note_admin
      }
    });
  } catch (error) {
    console.error('Reject payment request error:', error);
    res.status(500).json({ error: 'Erreur lors du rejet' });
  }
});

module.exports = router;