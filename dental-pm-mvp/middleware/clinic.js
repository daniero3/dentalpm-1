// dental-pm-mvp/middleware/clinic.js
const requireClinicId = (req, res, next) => {
  const clinicId = req.clinic_id
    || req.user?.clinic_id
    || req.user?.dataValues?.clinic_id
    || null;

  if (!clinicId && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Accès refusé',
      message: 'Aucune clinique associée à votre compte',
      code: 'NO_CLINIC'
    });
  }

  req.clinic_id = clinicId;
  next();
};

module.exports = { requireClinicId };
