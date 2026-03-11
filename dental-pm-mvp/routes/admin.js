const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { requireRole } = require('../middleware/auth');
const { Clinic, Subscription, SubscriptionInvoice, User, PaymentRequest } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// ============================================================
// CLINICS MANAGEMENT
// ============================================================

/**
 * GET /api/admin/clinics
 * List all clinics
 */
router.get('/clinics', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    const whereClause = {};
    if (status) whereClause.subscription_status = status;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const clinics = await Clinic.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await Clinic.count({ where: whereClause });

    // Get subscriptions separately to avoid Sequelize limit errors
    const clinicIds = clinics.map(c => c.id);
    let subscriptions = [];
    try {
      subscriptions = await Subscription.findAll({
        where: { clinic_id: { [Op.in]: clinicIds } },
        order: [['created_at', 'DESC']]
      });
    } catch (e) {
      console.log('Subscriptions fetch skipped:', e.message);
    }

    const clinicsWithSubs = clinics.map(clinic => {
      const clinicData = clinic.toJSON();
      const sub = subscriptions.find(s => s.clinic_id === clinic.id);
      clinicData.activeSubscription = sub || null;
      return clinicData;
    });

    res.json({
      clinics: clinicsWithSubs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get clinics error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * POST /api/admin/clinics
 * Create a new clinic with admin user
 */
router.post('/clinics', requireRole('SUPER_ADMIN'), [
  body('name').notEmpty().withMessage('Nom de la clinique requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('phone').notEmpty().withMessage('Téléphone requis'),
  body('address').notEmpty().withMessage('Adresse requise'),
  body('admin_username').notEmpty().withMessage('Nom d\'utilisateur admin requis'),
  body('admin_password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caractères'),
  body('admin_first_name').notEmpty().withMessage('Prénom admin requis'),
  body('admin_last_name').notEmpty().withMessage('Nom admin requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const {
      name, business_name, email, phone, address, city = 'Antananarivo',
      postal_code, nif_number, stat_number,
      admin_first_name, admin_last_name, admin_username, admin_email, admin_password,
      plan = 'ESSENTIAL'
    } = req.body;

    // Check if clinic email already exists
    const existingClinic = await Clinic.findOne({ where: { email } });
    if (existingClinic) {
      return res.status(409).json({ error: 'Un cabinet avec cet email existe déjà' });
    }

    // Check if admin username already exists
    const existingUser = await User.findOne({ where: { username: admin_username } });
    if (existingUser) {
      return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
    }

    // Create clinic
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const clinic = await Clinic.create({
      name,
      business_name: business_name || name,
      email,
      phone,
      address,
      city: city || 'Antananarivo',
      postal_code: postal_code || null,
      nif_number: nif_number || null,
      stat_number: stat_number || null,
      subscription_status: 'TRIAL',
      trial_ends_at: trialEnd,
      current_plan: plan,
      is_active: true,
      is_verified: true,
      onboarding_completed: false,
      created_by_user_id: req.user.id
    });

    // Create admin user for this clinic
    const passwordHash = await bcrypt.hash(admin_password, 12);
    const adminUser = await User.create({
      username: admin_username,
      email: admin_email || `${admin_username}@${email.split('@')[1]}`,
      password_hash: passwordHash,
      full_name: `${admin_first_name} ${admin_last_name}`,
      role: 'ADMIN',
      clinic_id: clinic.id,
      is_active: true
    });

    res.status(201).json({
      message: 'Cabinet créé avec succès',
      clinic: clinic.toJSON(),
      admin_user: {
        id: adminUser.id,
        username: adminUser.username,
        full_name: adminUser.full_name,
        role: adminUser.role
      }
    });

  } catch (error) {
    console.error('Create clinic error:', error);
    res.status(500).json({ error: 'Erreur lors de la création', details: error.message });
  }
});

/**
 * GET /api/admin/clinics/:id
 * Get clinic details
 */
router.get('/clinics/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (!clinic) {
      return res.status(404).json({ error: 'Cabinet non trouvé' });
    }

    let users = [];
    let subscriptions = [];
    try {
      users = await User.findAll({
        where: { clinic_id: clinic.id },
        attributes: { exclude: ['password_hash'] }
      });
    } catch (e) {}
    try {
      subscriptions = await Subscription.findAll({
        where: { clinic_id: clinic.id },
        order: [['created_at', 'DESC']]
      });
    } catch (e) {}

    res.json({
      clinic: clinic.toJSON(),
      users,
      subscriptions
    });
  } catch (error) {
    console.error('Get clinic error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/admin/clinics/:id
 * Update clinic
 */
router.put('/clinics/:id', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (!clinic) {
      return res.status(404).json({ error: 'Cabinet non trouvé' });
    }

    const allowedFields = [
      'name', 'business_name', 'email', 'phone', 'address', 'city',
      'postal_code', 'nif_number', 'stat_number', 'is_active',
      'subscription_status', 'current_plan', 'max_users', 'max_patients'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    await clinic.update(updates);
    res.json({ message: 'Cabinet mis à jour', clinic: clinic.toJSON() });
  } catch (error) {
    console.error('Update clinic error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * DELETE /api/admin/clinics/:id
 * Deactivate clinic
 */
router.delete('/clinics/:id', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (!clinic) {
      return res.status(404).json({ error: 'Cabinet non trouvé' });
    }
    await clinic.update({ is_active: false, subscription_status: 'CANCELLED' });
    res.json({ message: 'Cabinet désactivé' });
  } catch (error) {
    console.error('Delete clinic error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// SUBSCRIPTIONS MANAGEMENT
// ============================================================

router.get('/subscriptions', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      order: [['created_at', 'DESC']]
    });
    res.json({ subscriptions });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

router.post('/subscriptions', requireRole('SUPER_ADMIN'), [
  body('clinic_id').isUUID(),
  body('plan').isIn(['ESSENTIAL', 'PRO', 'GROUP']),
  body('duration_months').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { clinic_id, plan, duration_months, amount_mga = 0, notes } = req.body;

    const clinic = await Clinic.findByPk(clinic_id);
    if (!clinic) return res.status(404).json({ error: 'Cabinet non trouvé' });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + parseInt(duration_months));

    const subscription = await Subscription.create({
      clinic_id,
      plan,
      status: 'ACTIVE',
      start_date: startDate,
      end_date: endDate,
      duration_months: parseInt(duration_months),
      monthly_price_mga: amount_mga,
      notes,
      created_by_user_id: req.user.id
    });

    await clinic.update({
      subscription_status: 'ACTIVE',
      current_plan: plan
    });

    res.status(201).json({ message: 'Abonnement créé', subscription });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ============================================================
// STATS
// ============================================================

router.get('/stats', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const totalClinics = await Clinic.count();
    const activeClinics = await Clinic.count({ where: { subscription_status: 'ACTIVE' } });
    const trialClinics = await Clinic.count({ where: { subscription_status: 'TRIAL' } });

    res.json({
      clinics: { total: totalClinics, active: activeClinics, trial: trialClinics }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
