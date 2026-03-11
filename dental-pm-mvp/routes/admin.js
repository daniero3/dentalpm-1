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
      Clinic.count(),
      Subscription.count(),
      Subscription.count({ where: { status: 'ACTIVE' } }),
      Subscription.count({ where: { status: 'TRIAL' } }),
      Subscription.count({ where: { status: { [Op.in]: ['EXPIRED', 'TRIAL_EXPIRED'] } } }),
      SubscriptionInvoice.sum('amount_mga', {
        where: { status: 'PAID', paid_at: { [Op.gte]: startOfMonth } }
      }) || 0,
      SubscriptionInvoice.sum('amount_mga', {
        where: { status: 'PAID', paid_at: { [Op.gte]: startOfYear } }
      }) || 0,
      User.count({ where: { role: { [Op.ne]: 'SUPER_ADMIN' } } })
    ]);

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
        clinics: { total: totalClinics, active: activeSubscriptions, growth_rate: 0 },
        subscriptions: { total: totalSubscriptions, active: activeSubscriptions, trial: trialSubscriptions, expired: expiredSubscriptions },
        revenue: { monthly_mga: monthlyRevenue || 0, yearly_mga: yearlyRevenue || 0 },
        users: { total: totalUsers }
      },
      recent_clinics: recentClinics,
      subscriptions_by_plan: subscriptionsByPlan,
      recent_invoices: recentInvoices
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données du tableau de bord' });
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
      return res.status(400).json({ error: 'Paramètres invalides', details: errors.array() });
    }

    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { city: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }

    const { count, rows: clinics } = await Clinic.findAndCountAll({
      where: whereClause,
      include: [
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

    // Fetch latest subscription separately for each clinic
    const enrichedClinics = await Promise.all(clinics.map(async (clinic) => {
      const clinicData = clinic.toJSON();
      clinicData.user_count = clinicData.users ? clinicData.users.length : 0;
      delete clinicData.users;

      try {
        const latestSub = await Subscription.findOne({
          where: { clinic_id: clinic.id },
          attributes: ['id', 'plan', 'status', 'end_date', 'monthly_price_mga'],
          order: [['created_at', 'DESC']]
        });
        clinicData.latest_subscription = latestSub ? latestSub.toJSON() : null;
        clinicData.subscription_status = latestSub ? latestSub.status : null;
      } catch (e) {
        clinicData.latest_subscription = null;
        clinicData.subscription_status = null;
      }

      return clinicData;
    }));

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
    res.status(500).json({ error: 'Erreur lors de la récupération des cliniques' });
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
  body('address').isLength({ min: 5, max: 255 }).withMessage('Adresse requise (min 5 caractères)'),
  body('city').isLength({ min: 2, max: 50 }).withMessage('Ville requise'),
  body('postal_code').optional().isLength({ max: 10 }),
  body('phone').optional().isLength({ max: 20 }),
  body('email').isEmail().withMessage('Email valide requis'),
  body('nif_number').optional({ nullable: true, checkFalsy: true }).isLength({ min: 5, max: 20 }),
  body('stat_number').optional({ nullable: true, checkFalsy: true }).isLength({ min: 5, max: 20 }),
  body('admin_user').isObject().withMessage('Informations administrateur requises'),
  body('admin_user.username').isLength({ min: 3, max: 50 }).withMessage('Username requis (min 3 caractères)'),
  body('admin_user.email').isEmail().withMessage('Email admin valide requis'),
  body('admin_user.password').isLength({ min: 6 }).withMessage('Mot de passe requis (min 6 caractères)'),
  body('admin_user.first_name').isLength({ min: 2, max: 50 }).withMessage('Prénom requis (min 2 caractères)'),
  body('admin_user.last_name').isLength({ min: 2, max: 50 }).withMessage('Nom requis (min 2 caractères)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
        details: errors.array()
      });
    }

    const { admin_user, ...clinicData } = req.body;

    // Supprimer les champs vides optionnels
    if (!clinicData.nif_number) delete clinicData.nif_number;
    if (!clinicData.stat_number) delete clinicData.stat_number;
    if (!clinicData.phone) delete clinicData.phone;
    if (!clinicData.postal_code) delete clinicData.postal_code;

    const existingClinic = await Clinic.findOne({ where: { name: clinicData.name } });
    if (existingClinic) {
      return res.status(400).json({ error: 'Une clinique avec ce nom existe déjà' });
    }

    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email: admin_user.email }, { username: admin_user.username }] }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cet email ou username existe déjà' });
    }

    // Créer la clinique
    const clinic = await Clinic.create({ ...clinicData, is_active: true });

    // Créer l'utilisateur admin
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(admin_user.password, 12);

    const adminUser = await User.create({
      username: admin_user.username,
      email: admin_user.email,
      password_hash: hashedPassword,
      full_name: `${admin_user.first_name} ${admin_user.last_name}`,
      role: 'ADMIN',
      clinic_id: clinic.id,
      is_active: true
    });

    // Créer abonnement d'essai 14 jours
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
          full_name: adminUser.full_name
        },
        trial_subscription: trialSubscription
      }
    });

  } catch (error) {
    console.error('Create clinic error:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la clinique: ' + error.message });
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
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    const clinic = await Clinic.findByPk(id);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinique introuvable' });
    }

    await clinic.update(updates);
    res.json({ message: 'Clinique mise à jour avec succès', clinic });

  } catch (error) {
    console.error('Update clinic error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la clinique' });
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

    await clinic.update({ is_active: false });

    await Subscription.update(
      { status: 'CANCELLED', cancelled_at: new Date() },
      { where: { clinic_id: id, status: { [Op.in]: ['ACTIVE', 'TRIAL'] } } }
    );

    await User.update(
      { is_active: false },
      { where: { clinic_id: id } }
    );

    res.json({ message: 'Clinique désactivée avec succès' });

  } catch (error) {
    console.error('Deactivate clinic error:', error);
    res.status(500).json({ error: 'Erreur lors de la désactivation de la clinique' });
  }
});

/**
 * @route GET /api/admin/users
 * @desc Get all users
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
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// =============================================================================
// PAYMENT REQUESTS
// =============================================================================

/**
 * @route GET /api/admin/payment-requests
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
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    console.error('Get payment requests error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes' });
  }
});

/**
 * @route PATCH /api/admin/payment-requests/:id/verify
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

    if (!paymentRequest) return res.status(404).json({ error: 'Demande introuvable' });
    if (paymentRequest.status !== 'PENDING') {
      return res.status(409).json({ error: `Cette demande a déjà été traitée (statut: ${paymentRequest.status})` });
    }

    await paymentRequest.update({
      status: 'VERIFIED',
      verified_by_user_id: req.user.id,
      verified_at: new Date(),
      note_admin: note_admin || null
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const planFeatures = {
      ESSENTIAL: { max_practitioners: 1, features: ['patients', 'appointments', 'invoicing'] },
      PRO: { max_practitioners: 3, features: ['patients', 'appointments', 'invoicing', 'reports', 'support'] },
      GROUP: { max_practitioners: 999, features: ['patients', 'appointments', 'invoicing', 'reports', 'support', 'multi_site'] }
    };
    const plan = planFeatures[paymentRequest.plan_code] || planFeatures.ESSENTIAL;

    let subscription = await Subscription.findOne({ where: { clinic_id: paymentRequest.clinic_id } });

    if (subscription) {
      await subscription.update({
        plan: paymentRequest.plan_code,
        status: 'ACTIVE',
        billing_cycle: 'MONTHLY',
        monthly_price_mga: paymentRequest.amount_mga,
        start_date: startDate,
        end_date: endDate,
        trial_end_date: null,
        max_practitioners: plan.max_practitioners,
        features: plan.features
      });
    } else {
      subscription = await Subscription.create({
        clinic_id: paymentRequest.clinic_id,
        plan: paymentRequest.plan_code,
        status: 'ACTIVE',
        billing_cycle: 'MONTHLY',
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
      paymentRequest: { id: paymentRequest.id, status: 'VERIFIED', verified_at: paymentRequest.verified_at },
      subscription: { id: subscription.id, plan: subscription.plan, status: subscription.status, end_date: subscription.end_date }
    });
  } catch (error) {
    console.error('Verify payment request error:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

/**
 * @route PATCH /api/admin/payment-requests/:id/reject
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
    if (!paymentRequest) return res.status(404).json({ error: 'Demande introuvable' });
    if (paymentRequest.status !== 'PENDING') {
      return res.status(409).json({ error: `Cette demande a déjà été traitée (statut: ${paymentRequest.status})` });
    }

    await paymentRequest.update({
      status: 'REJECTED',
      verified_by_user_id: req.user.id,
      verified_at: new Date(),
      note_admin
    });

    res.json({
      message: 'Demande de paiement rejetée',
      paymentRequest: { id: paymentRequest.id, status: 'REJECTED', note_admin: paymentRequest.note_admin }
    });
  } catch (error) {
    console.error('Reject payment request error:', error);
    res.status(500).json({ error: 'Erreur lors du rejet' });
  }
});

module.exports = router;
