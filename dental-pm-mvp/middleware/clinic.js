const requireClinicId = async (req, res, next) => {
  try {
    const { user } = req;
    
    // Super admin bypass complet — pas de filtrage par clinic_id
    if (user.role === 'SUPER_ADMIN') {
      req.clinic_id = user.clinic_id || null;
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
