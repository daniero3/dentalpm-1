const jwt  = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error:"Token d'accès requis", code:'MISSING_TOKEN' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user || !user.is_active) {
      return res.status(403).json({ error:'Utilisateur non trouvé ou inactif', code:'USER_INACTIVE' });
    }

    req.user = user;

    // ✅ Normaliser req.user.id pour être toujours accessible
    // Sequelize stocke les valeurs dans .dataValues, 
    // mais .id fonctionne grâce au getter automatique
    // On force quand même pour éviter les surprises
    if (!req.user.id && req.user.dataValues?.id) {
      req.user.id = req.user.dataValues.id;
    }

    // ✅ Toujours setter req.clinic_id depuis toutes les sources
    req.clinic_id = decoded.clinic_id
      || user.clinic_id
      || user.dataValues?.clinic_id
      || null;

    // ✅ Si clinic_id encore null, setter aussi dans req.user pour cohérence
    if (req.clinic_id) {
      user.clinic_id = req.clinic_id;
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error:'Token expiré', code:'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error:'Token invalide', code:'INVALID_TOKEN' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error:'Authentication required', code:'AUTH_REQUIRED' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error:'Permissions insuffisantes', code:'INSUFFICIENT_PERMISSIONS', required_roles: roles, user_role: req.user.role });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) { req.user = null; req.clinic_id = null; return next(); }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findByPk(decoded.userId, { attributes: { exclude: ['password_hash'] } });
    req.user      = user?.is_active ? user : null;
    req.clinic_id = req.user ? (decoded.clinic_id || req.user.clinic_id || null) : null;
  } catch { req.user = null; req.clinic_id = null; }
  next();
};


// ── Middleware isolation cabinet ──────────────────────────────────────────────
// Garantit que chaque utilisateur ne voit que les données de SON cabinet
// SUPER_ADMIN = accès total (gestionnaire plateforme, pas de clinic_id)
// Tous les autres rôles = strictement limités à leur clinic_id
const requireClinicScope = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });

  // SUPER_ADMIN : accès complet, pas de restriction clinic
  if (req.user.role === 'SUPER_ADMIN') return next();

  // Tous les autres (ADMIN cabinet, DENTIST, ASSISTANT, ACCOUNTANT)
  // DOIVENT avoir un clinic_id
  const clinicId = req.clinic_id
    || req.user?.clinic_id
    || req.user?.dataValues?.clinic_id
    || null;

  if (!clinicId) {
    return res.status(403).json({
      error: 'Accès refusé — cabinet non identifié',
      code: 'NO_CLINIC_SCOPE'
    });
  }

  // Forcer clinic_id dans req pour tous les middlewares suivants
  req.clinic_id = clinicId;
  req.user.clinic_id = clinicId;
  next();
};

// ── Middleware SUPER_ADMIN uniquement ────────────────────────────────────────
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Accès réservé au Super Administrateur',
      code: 'SUPER_ADMIN_REQUIRED'
    });
  }
  next();
};


// ── Bloque SUPER_ADMIN sur les données médicales ─────────────────────────────
// Le SUPER_ADMIN gère la plateforme UNIQUEMENT (abonnements, cabinets)
// Il n'a AUCUN accès aux données des patients des cabinets
const blockSuperAdminFromMedicalData = (req, res, next) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Accès interdit — Le Super Administrateur ne peut pas consulter les données médicales des cabinets.',
      code: 'MEDICAL_DATA_FORBIDDEN'
    });
  }
  next();
};

module.exports = { authenticateToken, requireRole, optionalAuth, requireClinicScope, requireSuperAdmin, blockSuperAdminFromMedicalData };
