const { User } = require('../models');

const requireClinicId = async (req, res, next) => {
  try {
    const { user } = req;
    
    // Super admin can operate on their own clinic if assigned, otherwise bypass
    if (user.role === 'SUPER_ADMIN') {
      // Still attach clinic_id if available for data creation
      if (user.clinic_id) {
        req.clinic_id = user.clinic_id;
      }
      return next();
    }
    
    // Regular users must have clinic_id
    if (!user.clinic_id) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: 'Utilisateur non assigné à une clinique',
        code: 'NO_CLINIC_ASSIGNED'
      });
    }
    
    // Attach clinic_id to request for filtering
    req.clinic_id = user.clinic_id;
    next();
    
  } catch (error) {
    console.error('Clinic middleware error:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification de la clinique'
    });
  }
};

module.exports = { requireClinicId };