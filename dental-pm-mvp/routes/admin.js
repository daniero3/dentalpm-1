const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { requireRole } = require('../middleware/auth');
const { Clinic, Subscription, SubscriptionInvoice, User } = require('../models');
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
          attributes: ['id', 'plan', 'status', 'end_date', 'monthly_price_mga'],
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
      ...admin_user,
      password: hashedPassword,
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

module.exports = router;