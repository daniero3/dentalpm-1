const jwt = require('jsonwebtoken');

const requireClinicId = async (req, res, next) => {
  if (req.user?.role === 'SUPER_ADMIN') return next();

  // Source 1: req
  let clinicId = req.clinic_id
    || req.user?.clinic_id
    || req.user?.dataValues?.clinic_id;

  // Source 2: token JWT
  if (!clinicId) {
    try {
      const token = req.headers?.authorization?.split(' ')[1];
      if (token) clinicId = jwt.verify(token, process.env.JWT_SECRET).clinic_id;
    } catch(e) {}
  }

  // Source 3: base de données
  if (!clinicId) {
    try {
      const { User } = require('../models');
      const userId = req.user?.id || req.user?.dataValues?.id;
      if (userId) {
        const u = await User.findByPk(userId, { attributes: ['clinic_id'] });
        clinicId = u?.clinic_id || null;
      }
    } catch(e) {}
  }

  // Setter pour les handlers suivants
  req.clinic_id = clinicId || null;
  next(); // Toujours passer — le filtre clinic_id se fait dans chaque route
};

module.exports = { requireClinicId };
