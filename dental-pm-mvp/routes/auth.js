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
  body('role').isIn(['SUPER_ADMIN','ADMIN','DENTIST','ASSISTANT','ACCOUNTANT']),
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
    const clinics = await Clinic.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'city', 'phone'],
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
      } else {
        // Sinon charger toutes les cliniques actives
        availableClinics = await Clinic.findAll({
          where: { is_active: true },
          attributes: ['id', 'name', 'city', 'phone'],
          order: [['name', 'ASC']]
        });
      }
    } catch (e) { console.warn('Clinic load error:', e.message); }

    const needsSelection = availableClinics.length > 1;

    // Token avec clinic_id garanti
    const resolvedClinicId = user.clinic_id 
      || availableClinics[0]?.id 
      || null;

    const tokenPayload = {
      userId:    user.id,
      username:  user.username,
      role:      user.role,
      // Toujours inclure clinic_id si disponible
      // Même si sélection requise, on met le premier disponible
      clinic_id: resolvedClinicId || (availableClinics[0]?.id || null)
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

    try { await AuditLog.create({ user_id: user.id, action:'LOGIN', resource_type:'auth', ip_address: req.ip, description:`Connexion: ${user.username}` }); } catch (e) {}
    resetLoginAttempts(req, username);

    res.json({
      message: 'Connexion réussie', token,
      user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role, clinic_id: user.clinic_id || null, specialization: user.specialization },
      clinics: availableClinics,
      needs_clinic_selection: needsSelection
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

module.exports = router;
