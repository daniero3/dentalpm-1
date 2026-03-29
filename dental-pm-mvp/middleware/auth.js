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

module.exports = { authenticateToken, requireRole, optionalAuth };
