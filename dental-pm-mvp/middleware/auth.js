const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: "Token d'accès requis",
      code: 'MISSING_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user || !user.is_active) {
      return res.status(403).json({
        error: 'Utilisateur non trouvé ou inactif',
        code: 'USER_INACTIVE'
      });
    }

    req.user = user;

    // ✅ FIX — setter req.clinic_id directement pour requireClinicId
    // Priorité : token JWT > base de données
    req.clinic_id = decoded.clinic_id || user.clinic_id || null;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expiré',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(403).json({
      error: 'Token invalide',
      code: 'INVALID_TOKEN'
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Permissions insuffisantes',
        code: 'INSUFFICIENT_PERMISSIONS',
        required_roles: roles,
        user_role: req.user.role
      });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password_hash'] }
    });
    req.user = user && user.is_active ? user : null;
    // ✅ FIX aussi pour optionalAuth
    req.clinic_id = req.user ? (decoded.clinic_id || req.user.clinic_id || null) : null;
  } catch (error) {
    req.user = null;
    req.clinic_id = null;
  }
  next();
};

module.exports = { authenticateToken, requireRole, optionalAuth };
