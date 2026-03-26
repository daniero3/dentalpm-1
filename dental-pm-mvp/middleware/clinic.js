const { User, Clinic } = require('../models');

const requireClinicId = async (req, res, next) => {
  try {
    const { user } = req;

    // SUPER_ADMIN — bypass complet
    if (user.role === 'SUPER_ADMIN') {
      req.clinic_id = user.clinic_id || null;
      return next();
    }

    // Si clinic_id déjà dans le token
    if (user.clinic_id) {
      req.clinic_id = user.clinic_id;
      return next();
    }

    // clinic_id absent du token — on cherche en base
    try {
      const dbUser = await User.findByPk(user.id, {
        attributes: ['id', 'clinic_id']
      });

      if (dbUser && dbUser.clinic_id) {
        req.clinic_id = dbUser.clinic_id;
        return next();
      }

      // Dernier recours : si une seule clinique existe, on l'utilise
      const clinics = await Clinic.findAll({
        where: { is_active: true },
        attributes: ['id'],
        limit: 2
      });

      if (clinics.length === 1) {
        req.clinic_id = clinics[0].id;
        return next();
      }
    } catch (dbErr) {
      console.error('Clinic lookup error:', dbErr);
    }

    // Aucun clinic_id trouvé
    return res.status(403).json({
      error: 'Accès refusé',
      message: 'Utilisateur non assigné à une clinique',
      code: 'NO_CLINIC_ASSIGNED'
    });

  } catch (error) {
    console.error('Clinic middleware error:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification de la clinique' });
  }
};

module.exports = { requireClinicId };
