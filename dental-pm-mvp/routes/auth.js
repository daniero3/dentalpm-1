const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, Clinic, AuditLog, Subscription } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { loginRateLimiter, resetLoginAttempts } = require('../middleware/rateLimiter');
const { Op } = require('sequelize');

const router = express.Router();

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', [
  body('username').isLength({ min:3, max:50 }).matches(/^[a-zA-Z0-9_-]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min:6 }),
  body('full_name').isLength({ min:2, max:100 }),
  body('role').isIn(['ADMIN','DENTIST','ASSISTANT','ACCOUNTANT']), // SUPER_ADMIN non créable via API publique
  body('clinic_id').optional({ nullable:true }).isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const { username, email, password, full_name, role, phone, specialization, clinic_id } = req.body;

    const existingUser = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
    if (existingUser) return res.status(409).json({ error:"Un utilisateur existe déjà avec ce nom d'utilisateur ou cet email" });

    // Vérifier que la clinique existe si fournie
    if (clinic_id) {
      const clinic = await Clinic.findByPk(clinic_id);
      if (!clinic) return res.status(404).json({ error:'Cabinet non trouvé' });
    }

    const user = await User.create({
      username, email, password_hash: password,
      full_name, role, phone, specialization,
      clinic_id: clinic_id || null
    });

    try {
      await AuditLog.create({ user_id: user.id, action:'CREATE', resource_type:'users', resource_id: user.id, new_values:{ username, email, full_name, role, clinic_id }, ip_address: req.ip, description:`Nouvel utilisateur: ${username}` });
    } catch (e) { console.warn('AuditLog error:', e.message); }

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role, clinic_id: user.clinic_id }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error:"Erreur lors de la création de l'utilisateur", details: error.message });
  }
});

// ── GET /clinics-list — liste des cabinets pour inscription ──────────────────
router.get('/clinics-list', async (req, res) => {
  try {
    // Uniquement les cabinets avec abonnement actif (ACTIVE ou TRIAL)
    const clinics = await Clinic.findAll({
      where: {
        is_active: true,
        subscription_status: { [require('sequelize').Op.in]: ['ACTIVE', 'TRIAL'] }
      },
      attributes: ['id', 'name', 'city', 'phone', 'subscription_status', 'current_plan'],
      order: [['name', 'ASC']]
    });
    res.json({ clinics });
  } catch (error) {
    console.error('Clinics list error:', error);
    res.status(500).json({ error:'Erreur chargement cabinets' });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', loginRateLimiter, [
  body('username').notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const { username, password } = req.body;

    const user = await User.findOne({ where: { [Op.or]: [{ username }, { email: username }] } });
    if (!user || !user.is_active) return res.status(401).json({ error:"Nom d'utilisateur ou mot de passe incorrect" });

    const isValid = await user.validatePassword(password);
    if (!isValid) return res.status(401).json({ error:"Nom d'utilisateur ou mot de passe incorrect" });

    await user.update({ last_login_at: new Date() });

    // SUPER_ADMIN → token direct
    if (user.role === 'SUPER_ADMIN') {
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role, clinic_id: null },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );
      try { await AuditLog.create({ user_id: user.id, action:'LOGIN', resource_type:'auth', ip_address: req.ip, description:`Connexion SUPER_ADMIN: ${user.username}` }); } catch (e) {}
      resetLoginAttempts(req, username);
      return res.json({
        message: 'Connexion réussie', token,
        user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role, clinic_id: null },
        clinics: [],
        needs_clinic_selection: false
      });
    }

    // ✅ Charger TOUTES les cliniques disponibles avec abonnement actif
    let availableClinics = [];
    try {
      // Si l'utilisateur a une clinique assignée
      if (user.clinic_id) {
        const clinic = await Clinic.findByPk(user.clinic_id, {
          attributes: ['id', 'name', 'city', 'phone']
        });
        if (clinic) availableClinics = [clinic];
      }
      // SÉCURITÉ : on ne charge PLUS toutes les cliniques si user n'a pas de clinic_id
      // Un user sans clinic_id ne peut pas se connecter (sauf SUPER_ADMIN géré plus haut)
    } catch (e) { console.warn('Clinic load error:', e.message); }

    const needsSelection = availableClinics.length > 1;

    // Token avec clinic_id garanti
    const resolvedClinicId = user.clinic_id || availableClinics[0]?.id || null;

    // SÉCURITÉ : bloquer si pas de clinic_id pour les rôles non-SUPER_ADMIN
    if (!resolvedClinicId && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Votre compte n\'est associé à aucun cabinet. Contactez votre administrateur.',
        code: 'NO_CLINIC_ASSIGNED'
      });
    }

    const tokenPayload = {
      userId:    user.id,
      username:  user.username,
      role:      user.role,
      clinic_id: resolvedClinicId
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

    try { await AuditLog.create({ user_id: user.id, action:'LOGIN', resource_type:'auth', ip_address: req.ip, description:`Connexion: ${user.username}` }); } catch (e) {}
    resetLoginAttempts(req, username);

    // Récupérer le plan d'abonnement pour la sidebar
    let userPlan = null;
    if (user.role !== 'SUPER_ADMIN' && resolvedClinicId) {
      try {
        const { Subscription } = require('../models');
        const sub = await Subscription.findOne({
          where: { clinic_id: resolvedClinicId },
          order: [['created_at', 'DESC']]
        });
        if (sub && ['ACTIVE','TRIAL'].includes(sub.status)) {
          const now = new Date();
          const notExpired = !sub.end_date || new Date(sub.end_date) > now;
          if (notExpired) userPlan = sub.plan;
        }
      } catch(e) {}
    }

    res.json({
      message: 'Connexion réussie', token,
      user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role, clinic_id: user.clinic_id || null, specialization: user.specialization, plan: userPlan },
      clinics: availableClinics,
      needs_clinic_selection: needsSelection,
      plan: userPlan
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error:'Erreur lors de la connexion' });
  }
});

// ── Select Clinic ─────────────────────────────────────────────────────────────
router.post('/select-clinic', authenticateToken, async (req, res) => {
  try {
    const { clinic_id } = req.body;
    if (!clinic_id) return res.status(400).json({ error:'clinic_id requis' });

    const clinic = await Clinic.findByPk(clinic_id, { attributes:['id','name','city'] });
    if (!clinic) return res.status(404).json({ error:'Cabinet non trouvé' });

    const user = await User.findByPk((req.user?.id || req.user?.dataValues?.id) || req.user.userId);
    if (!user) return res.status(404).json({ error:'Utilisateur non trouvé' });

    // Mettre à jour le clinic_id de l'utilisateur si pas encore assigné
    if (!user.clinic_id) {
      await user.update({ clinic_id });
    }

    const finalToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, clinic_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Cabinet sélectionné', token: finalToken,
      user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role, clinic_id, specialization: user.specialization },
      clinic: { id: clinic.id, name: clinic.name, city: clinic.city }
    });
  } catch (error) {
    console.error('Select clinic error:', error);
    res.status(500).json({ error:'Erreur sélection cabinet' });
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    try { await AuditLog.create({ user_id: (req.user?.id || req.user?.dataValues?.id), action:'LOGOUT', resource_type:'auth', ip_address: req.ip, description:`Déconnexion: ${req.user.username}` }); } catch (e) {}
    res.json({ message:'Déconnexion réussie' });
  } catch (error) { res.status(500).json({ error:'Erreur lors de la déconnexion' }); }
});

// ── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk((req.user?.id || req.user?.dataValues?.id) || req.user.userId, { attributes:{ exclude:['password_hash'] } });
    if (!user) return res.status(404).json({ error:'Utilisateur non trouvé' });
    res.json(user);
  } catch (error) { res.status(500).json({ error:'Erreur profil' }); }
});

router.put('/profile', authenticateToken, [
  body('full_name').optional().isLength({ min:2, max:100 }),
  body('phone').optional(),
  body('specialization').optional().isLength({ max:100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides' });
    const { full_name, phone, specialization } = req.body;
    const user = await User.findByPk((req.user?.id || req.user?.dataValues?.id) || req.user.userId);
    if (!user) return res.status(404).json({ error:'Utilisateur non trouvé' });
    await user.update({ full_name: full_name||user.full_name, phone: phone||user.phone, specialization: specialization||user.specialization });
    res.json({ message:'Profil mis à jour', user: await User.findByPk(user.id, { attributes:{ exclude:['password_hash'] } }) });
  } catch (error) { res.status(500).json({ error:'Erreur mise à jour profil' }); }
});


// ── POST /api/auth/register-clinic — Création cabinet depuis RegisterPage ──
router.post('/register-clinic', [
  require('express-validator').body('cabinet').notEmpty(),
  require('express-validator').body('email').isEmail().normalizeEmail(),
  require('express-validator').body('phone').notEmpty(),
  require('express-validator').body('plan').optional().isIn(['ESSENTIAL','PRO','GROUP']),
], async (req, res) => {
  try {
    const { cabinet, email, phone, city, dentists, plan = 'PRO' } = req.body;
    if (!cabinet || !email || !phone) return res.status(400).json({ error: 'Champs requis manquants' });

    // Vérifier si email déjà utilisé
    const existing = await Clinic.findOne({ where: { email } });
    if (existing) {
      // Retourner l'ID existant pour permettre la suite du flux
      return res.status(409).json({ 
        error: 'Un cabinet avec cet email existe deja',
        clinic: { id: existing.id, name: existing.name, email: existing.email }
      });
    }

    const PLAN_PRICES = { ESSENTIAL:149000, PRO:199000, GROUP:299000 };
    const PLAN_USERS  = { ESSENTIAL:2, PRO:5, GROUP:50 };

    // Créer le cabinet
    const clinic = await Clinic.create({
      name:                cabinet,
      email,
      phone,
      city:                city || 'Madagascar',
      subscription_status: 'TRIAL',
      current_plan:        plan,
      is_active:           true,
      is_verified:         false,
      onboarding_completed: false,
      max_users:           PLAN_USERS[plan] || 5,
    });

    // Créer le compte admin du cabinet (mot de passe temporaire)
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    await User.create({
      username:     email.split('@')[0].replace(/[^a-zA-Z0-9]/g,'_').slice(0,30) + '_' + Date.now().toString().slice(-4),
      email,
      password_hash: tempPassword,
      full_name:    cabinet,
      role:         'ADMIN',
      clinic_id:    clinic.id,
      is_active:    true,
      is_verified:  true,
      onboarding_completed: false,
    });

    // Créer l'abonnement trial 7 jours
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await require('../models').Subscription.create({
      clinic_id:         clinic.id,
      plan,
      status:            'TRIAL',
      start_date:        now,
      trial_end_date:    trialEnd,
      end_date:          trialEnd,
      max_practitioners: PLAN_USERS[plan] || 5,
      price_mga:         PLAN_PRICES[plan] || 199000,
    });

    // Email de bienvenue
    try {
      const { sendWelcomeTrial } = require('../utils/mailer');
      await sendWelcomeTrial(email, cabinet, plan, trialEnd);
    } catch(e) { console.warn('Welcome email (non-fatal):', e.message); }

    res.status(201).json({
      message: 'Cabinet créé avec succès. Essai de 7 jours activé.',
      clinic: { id: clinic.id, name: clinic.name, plan, trial_end: trialEnd },
      temp_password: tempPassword,
    });
  } catch (error) {
    console.error('Register clinic error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});


// ── POST /api/auth/change-password ───────────────────────────────────────────
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Nouveau mot de passe trop court (min 6 caractères)' });
    }
    const userId = req.user?.id || req.user?.dataValues?.id;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const isValid = await user.validatePassword(current_password);
    if (!isValid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

    await user.update({ password_hash: new_password });
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.dataValues?.id;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const { full_name, phone, specialization } = req.body;
    await user.update({ full_name, phone, specialization });
    res.json({ message: 'Profil mis à jour', user: { full_name: user.full_name, phone: user.phone, specialization: user.specialization } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ── GET /api/auth/clinic-users — Liste des users du cabinet connecté ──────────
router.get('/clinic-users', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic_id || req.user?.clinic_id;
    if (!clinicId) return res.status(403).json({ error: 'Cabinet non identifié' });

    const users = await User.findAll({
      where: { clinic_id: clinicId, role: { [Op.ne]: 'SUPER_ADMIN' } },
      attributes: ['id','username','email','full_name','role','phone','specialization','is_active','created_at'],
      order: [['created_at', 'ASC']]
    });

    // Récupérer la limite du plan
    const { Subscription } = require('../models');
    const sub = await Subscription.findOne({
      where: { clinic_id: clinicId },
      order: [['created_at', 'DESC']]
    });
    const PLAN_LIMITS = { ESSENTIAL: 2, PRO: 5, GROUP: 50, TRIAL: 5 };
    const limit = PLAN_LIMITS[sub?.plan] || 2;

    res.json({ users, count: users.length, limit, plan: sub?.plan || 'ESSENTIAL' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── POST /api/auth/clinic-users — Créer un user pour son propre cabinet ───────
router.post('/clinic-users', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic_id || req.user?.clinic_id;
    if (!clinicId) return res.status(403).json({ error: 'Cabinet non identifié' });

    // Seul l'ADMIN du cabinet peut créer des users
    if (!['ADMIN','SUPER_ADMIN'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Seul l\'administrateur du cabinet peut creer des utilisateurs' });
    }

    const { Subscription } = require('../models');
    const sub = await Subscription.findOne({
      where: { clinic_id: clinicId },
      order: [['created_at', 'DESC']]
    });

    // Vérifier limite du plan
    const PLAN_LIMITS = { ESSENTIAL: 2, PRO: 5, GROUP: 50, TRIAL: 5 };
    const limit = PLAN_LIMITS[sub?.plan] || 2;
    const currentCount = await User.count({ where: { clinic_id: clinicId, is_active: true, role: { [Op.ne]: 'SUPER_ADMIN' } } });

    if (currentCount >= limit) {
      return res.status(403).json({
        error: `Limite atteinte pour votre plan ${sub?.plan || 'ESSENTIAL'} (${limit} utilisateur${limit > 1 ? 's' : ''} max)`,
        code: 'PLAN_LIMIT_REACHED',
        limit, current: currentCount, plan: sub?.plan
      });
    }

    const { full_name, email, username, password, role = 'DENTIST', phone, specialization } = req.body;
    if (!full_name || !email || !username || !password) {
      return res.status(400).json({ error: 'Champs requis: full_name, email, username, password' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Mot de passe minimum 6 caractères' });
    if (!['DENTIST','ASSISTANT','ACCOUNTANT','ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    const existing = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
    if (existing) return res.status(409).json({ error: 'Nom utilisateur ou email deja utilise' });

    const user = await User.create({
      username, email, password_hash: password,
      full_name, role, phone, specialization,
      clinic_id: clinicId,
      is_active: true, is_verified: true,
      onboarding_completed: true,
    });

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role }
    });
  } catch (error) {
    console.error('Create clinic user error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── PATCH /api/auth/clinic-users/:id — Activer/désactiver un user ─────────────
router.patch('/clinic-users/:id', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic_id || req.user?.clinic_id;
    if (!clinicId) return res.status(403).json({ error: 'Cabinet non identifié' });
    if (!['ADMIN','SUPER_ADMIN'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    const userId = req.user?.id || req.user?.dataValues?.id;
    if (req.params.id === userId) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier votre propre compte ici' });
    }

    const user = await User.findOne({ where: { id: req.params.id, clinic_id: clinicId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const { is_active, full_name, role, phone, specialization } = req.body;
    await user.update({ is_active, full_name, role, phone, specialization });

    res.json({ message: 'Utilisateur mis à jour', user });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── DELETE /api/auth/clinic-users/:id — Supprimer un user du cabinet ──────────
router.delete('/clinic-users/:id', authenticateToken, async (req, res) => {
  try {
    const clinicId = req.clinic_id || req.user?.clinic_id;
    if (!clinicId) return res.status(403).json({ error: 'Cabinet non identifié' });
    if (!['ADMIN','SUPER_ADMIN'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    const userId = req.user?.id || req.user?.dataValues?.id;
    if (req.params.id === userId) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const user = await User.findOne({ where: { id: req.params.id, clinic_id: clinicId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    await user.update({ is_active: false });
    res.json({ message: 'Utilisateur désactivé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
