const jwt  = require('jsonwebtoken');
const { User, Clinic } = require('../models');

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['ACTIVE', 'TRIAL']);

function buildClinicAccessError(clinic) {
  return {
    error: 'Abonnement annulé ou inactif. Accès à la plateforme désactivé.',
    code: 'SUBSCRIPTION_INACTIVE',
    subscription_status: clinic?.subscription_status || null
  };
}

function hasActiveClinicAccess(clinic) {
  return !!clinic
    && clinic.is_active === true
    && ACTIVE_SUBSCRIPTION_STATUSES.has(clinic.subscription_status);
}

async function loadClinicAccess(clinicId) {
  if (!clinicId) return null;
  return Clinic.findByPk(clinicId, {
    attributes: ['id', 'name', 'is_active', 'subscription_status', 'current_plan']
  });
}

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

    if (user.role !== 'SUPER_ADMIN') {
      const clinic = await loadClinicAccess(req.clinic_id);
      if (!hasActiveClinicAccess(clinic)) {
        return res.status(403).json(buildClinicAccessError(clinic));
      }
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
const requireClinicScope = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });

  // SUPER_ADMIN : pas de restriction clinic (mais bloqué sur données médicales)
  if (req.user.role === 'SUPER_ADMIN') return next();

  // Chercher clinic_id — token d'abord, puis user object, puis DB
  let clinicId = req.clinic_id
    || req.user?.clinic_id
    || req.user?.dataValues?.clinic_id
    || null;

  // Si toujours null, relire depuis la DB (ancien token avant correction)
  if (!clinicId) {
    try {
      const { User } = require('../models');
      const userId = req.user.id || req.user.dataValues?.id || req.user.userId;
      const freshUser = await User.findByPk(userId, { attributes: ['clinic_id','role'] });
      clinicId = freshUser?.clinic_id || null;
    } catch(e) {
      console.warn('[clinicScope] DB lookup error:', e.message);
    }
  }

  if (!clinicId) {
    console.warn(`[clinicScope] BLOCKED: role=${req.user?.role} path=${req.path} userId=${req.user?.id}`);
    return res.status(403).json({
      error: 'Votre compte n\'est associé à aucun cabinet. Contactez votre administrateur.',
      code: 'NO_CLINIC_SCOPE'
    });
  }

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
  // Log pour debug
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth,
  requireClinicScope,
  requireSuperAdmin,
  blockSuperAdminFromMedicalData,
  hasActiveClinicAccess,
  buildClinicAccessError,
  loadClinicAccess
};
