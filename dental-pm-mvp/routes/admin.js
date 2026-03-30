const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { requireRole } = require('../middleware/auth');
const { Clinic, Subscription, SubscriptionInvoice, User, PaymentRequest } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');
const _getUserId = (req) => {
  const v = req.user?.id || req.user?.dataValues?.id || req.user?.userId;
  if (v) return v;
  try {
    const t = req.headers?.authorization?.split(' ')[1];
    return t ? (jwt.verify(t, process.env.JWT_SECRET).userId || null) : null;
  } catch(e) { return null; }
};

// ============================================================
// CLINICS MANAGEMENT
// ============================================================

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

    const clinicIds = clinics.map(c => c.id);
    let subscriptions = [];
    try {
      subscriptions = await Subscription.findAll({
        where: { clinic_id: { [Op.in]: clinicIds } },
        order: [['created_at', 'DESC']]
      });
    } catch (e) { console.log('Subscriptions fetch skipped:', e.message); }

    const clinicsWithSubs = clinics.map(clinic => {
      const clinicData = clinic.toJSON();
      clinicData.activeSubscription = subscriptions.find(s => s.clinic_id === clinic.id) || null;
      return clinicData;
    });

    res.json({
      clinics: clinicsWithSubs,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get clinics error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

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
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    const {
      name, business_name, email, phone, address, city = 'Antananarivo',
      postal_code, nif_number, stat_number,
      admin_first_name, admin_last_name, admin_username, admin_email, admin_password,
      plan = 'ESSENTIAL'
    } = req.body;

    const existingClinic = await Clinic.findOne({ where: { email } });
    if (existingClinic) return res.status(409).json({ error: 'Un cabinet avec cet email existe déjà' });

    const existingUser = await User.findOne({ where: { username: admin_username } });
    if (existingUser) return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà pris' });

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const clinic = await Clinic.create({
      name, business_name: business_name || name, email, phone, address,
      city: city || 'Antananarivo', postal_code: postal_code || null,
      nif_number: nif_number || null, stat_number: stat_number || null,
      subscription_status: 'TRIAL', trial_ends_at: trialEnd, current_plan: plan,
      is_active: true, is_verified: true, onboarding_completed: false,
      created_by_user_id: _getUserId(req)
    });

    const passwordHash = await bcrypt.hash(admin_password, 12);
    const adminUser = await User.create({
      username: admin_username,
      email: admin_email || `${admin_username}@${email.split('@')[1]}`,
      password_hash: passwordHash,
      full_name: `${admin_first_name} ${admin_last_name}`,
      role: 'ADMIN', clinic_id: clinic.id, is_active: true
    });

    res.status(201).json({
      message: 'Cabinet créé avec succès',
      clinic: clinic.toJSON(),
      admin_user: { id: adminUser.id, username: adminUser.username, full_name: adminUser.full_name, role: adminUser.role }
    });
  } catch (error) {
    console.error('Create clinic error:', error);
    res.status(500).json({ error: 'Erreur lors de la création', details: error.message });
  }
});

router.get('/clinics/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (!clinic) return res.status(404).json({ error: 'Cabinet non trouvé' });

    let users = [], subscriptions = [];
    try { users = await User.findAll({ where: { clinic_id: clinic.id }, attributes: { exclude: ['password_hash'] } }); } catch (e) {}
    try { subscriptions = await Subscription.findAll({ where: { clinic_id: clinic.id }, order: [['created_at', 'DESC']] }); } catch (e) {}

    res.json({ clinic: clinic.toJSON(), users, subscriptions });
  } catch (error) {
    console.error('Get clinic error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/clinics/:id', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (!clinic) return res.status(404).json({ error: 'Cabinet non trouvé' });

    const allowedFields = ['name', 'business_name', 'email', 'phone', 'address', 'city',
      'postal_code', 'nif_number', 'stat_number', 'is_active', 'subscription_status', 'current_plan', 'max_users', 'max_patients'];
    const updates = {};
    allowedFields.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    await clinic.update(updates);
    res.json({ message: 'Cabinet mis à jour', clinic: clinic.toJSON() });
  } catch (error) {
    console.error('Update clinic error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

router.delete('/clinics/:id', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (!clinic) return res.status(404).json({ error: 'Cabinet non trouvé' });
    await clinic.update({ is_active: false, subscription_status: 'CANCELLED' });
    res.json({ message: 'Cabinet désactivé' });
  } catch (error) {
    console.error('Delete clinic error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// SUBSCRIPTIONS
// ============================================================

router.get('/subscriptions', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({ order: [['created_at', 'DESC']] });
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
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    const { clinic_id, plan, duration_months, amount_mga = 0, notes } = req.body;
    const clinic = await Clinic.findByPk(clinic_id);
    if (!clinic) return res.status(404).json({ error: 'Cabinet non trouvé' });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + parseInt(duration_months));

    const subscription = await Subscription.create({
      clinic_id, plan, status: 'ACTIVE', start_date: startDate, end_date: endDate,
      duration_months: parseInt(duration_months), monthly_price_mga: amount_mga,
      notes, created_by_user_id: _getUserId(req)
    });

    await clinic.update({ subscription_status: 'ACTIVE', current_plan: plan });
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
    const totalClinics  = await Clinic.count().catch(() => 0);
    const activeClinics = await Clinic.count({ where: { subscription_status: 'ACTIVE' } }).catch(() => 0);
    const trialClinics  = await Clinic.count({ where: { subscription_status: 'TRIAL' } }).catch(() => 0);
    res.json({ clinics: { total: totalClinics, active: activeClinics, trial: trialClinics } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// DASHBOARD SUPER ADMIN  ← NOUVEAU
// ============================================================

router.get('/dashboard', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const totalClinics   = await Clinic.count().catch(() => 0);
    const activeClinics  = await Clinic.count({ where: { subscription_status: 'ACTIVE' } }).catch(() => 0);
    const trialClinics   = await Clinic.count({ where: { subscription_status: 'TRIAL' } }).catch(() => 0);
    const expiredClinics = await Clinic.count({ where: { subscription_status: 'EXPIRED' } }).catch(() => 0);
    const totalUsers     = await User.count().catch(() => 0);

    let recentClinics = [];
    try {
      recentClinics = await Clinic.findAll({
        order: [['created_at', 'DESC']], limit: 5,
        attributes: ['id', 'name', 'email', 'city', 'subscription_status', 'current_plan', 'created_at']
      });
    } catch (e) {}

    let pendingPayments = [];
    try {
      pendingPayments = await PaymentRequest.findAll({
        where: { status: 'PENDING' }, limit: 10, order: [['created_at', 'DESC']]
      });
    } catch (e) {}

    res.json({
      stats: {
        totalClinics, activeClinics, trialClinics, expiredClinics,
        totalUsers, pendingPayments: pendingPayments.length
      },
      recentClinics,
      pendingPayments
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;

// ============================================================
// PAYMENT REQUESTS (Validation paiements)
// ============================================================

// GET /api/admin/payment-requests?status=PENDING
router.get('/payment-requests', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    let requests = [];
    try {
      requests = await PaymentRequest.findAll({
        where,
        order: [['created_at', 'DESC']],
        include: [
          { model: Clinic, as: 'clinic', attributes: ['id', 'name', 'email'], required: false },
          { model: User, as: 'submittedBy', attributes: ['id', 'full_name', 'email'], required: false }
        ]
      });
    } catch (e) {
      // Si les associations n'existent pas, fetch sans include
      requests = await PaymentRequest.findAll({ where, order: [['created_at', 'DESC']] });
    }

    res.json({ paymentRequests: requests });
  } catch (error) {
    console.error('Get payment requests error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// PATCH /api/admin/payment-requests/:id/verify
router.patch('/payment-requests/:id/verify', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const request = await PaymentRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ error: 'Demande non trouvée' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Demande déjà traitée' });

    await request.update({
      status: 'VERIFIED',
      note_admin: req.body.note_admin || null,
      verified_by: _getUserId(req),
      verified_at: new Date()
    });

    // Activer l'abonnement de la clinique
    if (request.clinic_id) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      await Clinic.update(
        { subscription_status: 'ACTIVE' },
        { where: { id: request.clinic_id } }
      );
      try {
        await Subscription.create({
          clinic_id: request.clinic_id,
          plan: request.plan_code || 'ESSENTIAL',
          status: 'ACTIVE',
          start_date: new Date(),
          end_date: endDate,
          duration_months: 1,
          monthly_price_mga: request.amount_mga || 0,
          notes: `Paiement vérifié le ${new Date().toLocaleDateString('fr-FR')}`,
          created_by_user_id: _getUserId(req)
        });
      } catch (e) { console.log('Subscription creation skipped:', e.message); }
    }

    res.json({ message: 'Paiement vérifié, abonnement activé', request });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// PATCH /api/admin/payment-requests/:id/reject
router.patch('/payment-requests/:id/reject', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const request = await PaymentRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ error: 'Demande non trouvée' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Demande déjà traitée' });

    await request.update({
      status: 'REJECTED',
      note_admin: req.body.note_admin || null,
      verified_by: _getUserId(req),
      verified_at: new Date()
    });

    res.json({ message: 'Demande rejetée', request });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});
module.exports = router;
