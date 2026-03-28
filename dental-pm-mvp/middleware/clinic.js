// dental-pm-mvp/middleware/clinic.js
// Fix: lire clinic_id depuis req.user.clinic_id si req.clinic_id absent

const requireClinicId = (req, res, next) => {
  // ✅ Chercher clinic_id dans plusieurs endroits
  const clinicId = req.clinic_id 
    || req.user?.clinic_id 
    || req.user?.clinicId 
    || null;

  if (!clinicId) {
    return res.status(403).json({
      error: 'Accès refusé',
      message: 'Aucune clinique associée à votre compte',
      code: 'NO_CLINIC'
    });
  }

  // ✅ Toujours setter req.clinic_id pour les routes suivantes
  req.clinic_id = clinicId;
  next();
};

module.exports = { requireClinicId };
