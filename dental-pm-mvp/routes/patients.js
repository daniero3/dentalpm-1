const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Patient, Treatment, Appointment, Invoice, AuditLog, User, sequelize } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// ✅ requireClinicId — lit depuis JWT ET la DB si clinic_id absent
const requireClinicId = async (req, res, next) => {
  if (req.user?.role === 'SUPER_ADMIN') return next();
  
  // Source 1: req directement
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

  // Source 3: base de données (dernier recours)
  if (!clinicId) {
    try {
      const userId = req.user?.id || req.user?.dataValues?.id;
      if (userId) {
        const u = await User.findByPk(userId, { attributes: ['clinic_id'] });
        clinicId = u?.clinic_id || null;
      }
    } catch(e) {}
  }

  // Si toujours null → laisser passer quand même (SUPER_ADMIN ou cas spécial)
  req.clinic_id = clinicId;
  next();
};

const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
const getUserId   = (req) => {
  const v = req.user?.id || req.user?.dataValues?.id;
  if (v) return v;
  try {
    const t = req.headers?.authorization?.split(' ')[1];
    return t ? (jwt.verify(t, process.env.JWT_SECRET).userId || null) : null;
  } catch(e) { return null; }
};
const { auditLogger } = require('../middleware/auditLogger');
const { Op } = require('sequelize');

const router = express.Router();

// ✅ Subscription vérifiée côté frontend (LicensingGuard)
router.use(auditLogger('patients'));

// ── GET / — List patients ────────────────────────────────────────────────────
router.get('/', requireClinicId, [
  query('search').optional().isLength({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Paramètres invalides', details: errors.array() });
    }

    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // ✅ Lire clinic_id depuis req.clinic_id OU req.user.clinic_id
    const clinicId = req.clinic_id || req.user?.clinic_id || null;
    let whereClause = {};
    if (clinicId) whereClause.clinic_id = clinicId;

    if (search) {
      whereClause[Op.or] = [
        { patient_number: { [Op.iLike]: `%${search}%` } },
        { first_name:     { [Op.iLike]: `%${search}%` } },
        { last_name:      { [Op.iLike]: `%${search}%` } },
        { phone_primary:  { [Op.iLike]: `%${search}%` } },
        { email:          { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: patients } = await Patient.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['last_name', 'ASC'], ['first_name', 'ASC']],
      include: [{
        model: User,
        as: 'createdBy',
        attributes: { exclude: ['password_hash'] },
        required: false
      }]
    });

    res.json({
      patients,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('List patients error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des patients', message: error.message });
  }
});

// ── GET /:id — Single patient ────────────────────────────────────────────────
router.get('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    let whereClause = { id: req.params.id };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const patient = await Patient.findOne({
      where: whereClause,
      include: [
        { model: Appointment, as: 'appointments', limit: 5, order: [['appointment_date', 'DESC']], required: false },
        { model: Treatment,   as: 'treatments',   limit: 10, order: [['treatment_date', 'DESC']], required: false },
        { model: Invoice,     as: 'invoices',     limit: 5,  order: [['invoice_date', 'DESC']],  required: false }
      ]
    });

    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    try {
      await AuditLog.create({
        user_id: getUserId(req),
        action: 'VIEW',
        resource_type: 'patients',
        resource_id: patient.id,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        description: `Consultation fiche patient: ${patient.first_name} ${patient.last_name}`
      });
    } catch (auditErr) { console.error('Audit log error:', auditErr); }

    res.json(patient);
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du patient', message: error.message });
  }
});

// ── POST / — Create patient ──────────────────────────────────────────────────
router.post('/', requireClinicId, [
  body('first_name').isLength({ min: 2, max: 50 }).withMessage('Prénom requis (2-50 caractères)'),
  body('last_name').isLength({ min: 2, max: 50 }).withMessage('Nom requis (2-50 caractères)'),
  body('date_of_birth').isISO8601().withMessage('Date de naissance invalide (format YYYY-MM-DD)'),
  body('gender').notEmpty().withMessage('Genre requis'),
  body('phone_primary').matches(/^\+?\d[\d\s\-]{7,15}$/).withMessage('Numéro de téléphone invalide'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalide'),
  body('address').optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
  body('city').optional({ nullable: true, checkFalsy: true }).isLength({ max: 50 }),
  body('emergency_contact_name').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }),
  body('emergency_contact_phone').optional({ nullable: true, checkFalsy: true }),
  body('medical_history').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }),
  body('allergies').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 }),
  body('current_medications').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    let gender = (req.body.gender || '').toString().toLowerCase().trim();
    if (['m', 'male', 'homme', 'masculin'].includes(gender)) gender = 'M';
    else if (['f', 'female', 'femme', 'féminin', 'feminin'].includes(gender)) gender = 'F';
    else return res.status(400).json({ error: 'Genre invalide', message: 'Le genre doit être M ou F' });

    const clinicId = req.clinic_id || req.body.clinic_id || null;

    let patient_number = null;
    try {
      if (clinicId) {
        await sequelize.query(`
          INSERT INTO counters (id, clinic_id, counter_type, current_value, created_at, updated_at)
          VALUES (gen_random_uuid(), :clinic_id, 'patient', 1, NOW(), NOW())
          ON CONFLICT (clinic_id, counter_type) DO UPDATE SET
            current_value = counters.current_value + 1,
            updated_at = NOW()
        `, { replacements: { clinic_id: clinicId } });

        const [[counterRow]] = await sequelize.query(
          `SELECT current_value FROM counters WHERE clinic_id = :clinic_id AND counter_type = 'patient'`,
          { replacements: { clinic_id: clinicId } }
        );
        const counterValue = counterRow?.current_value || 1;
        patient_number = `PAT-${String(counterValue).padStart(6, '0')}`;
      } else {
        patient_number = `PAT-${Date.now().toString().slice(-6)}`;
      }
    } catch (counterErr) {
      console.error('Counter error (non-fatal):', counterErr);
      patient_number = `PAT-${Date.now().toString().slice(-6)}`;
    }

    const patientData = {
      ...req.body,
      patient_number,
      gender,
      clinic_id: clinicId,
      created_by_user_id: getUserId(req),
      emergency_contact_name:  req.body.emergency_contact_name  || null,
      emergency_contact_phone: req.body.emergency_contact_phone || null,
      payer_type: req.body.payer_type || 'CASH',
    };

    delete patientData.clinic_id_from_body;

    const patient = await Patient.create(patientData);
    res.status(201).json({ message: 'Patient créé avec succès', patient });

  } catch (error) {
    console.error('Create patient error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Erreur de validation',
        details: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    res.status(500).json({ error: 'Erreur lors de la création du patient', message: error.message });
  }
});

// ── PUT /:id — Update patient ────────────────────────────────────────────────
router.put('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide'),
  body('first_name').optional().isLength({ min: 1, max: 50 }).trim(),
  body('last_name').optional().isLength({ min: 1, max: 50 }).trim(),
  body('phone_primary').optional().matches(/^\+?\d[\d\s\-]{7,15}$/),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    let whereClause = { id: req.params.id };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const oldValues = patient.toJSON();
    await patient.update(req.body);

    try {
      await AuditLog.create({
        user_id: getUserId(req),
        action: 'UPDATE',
        resource_type: 'patients',
        resource_id: patient.id,
        old_values: oldValues,
        new_values: req.body,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        description: `Patient mis à jour: ${patient.first_name} ${patient.last_name}`
      });
    } catch (auditErr) { console.error('Audit log error:', auditErr); }

    res.json({ message: 'Patient mis à jour avec succès', patient });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du patient', message: error.message });
  }
});

// ── DELETE /:id — Soft delete ────────────────────────────────────────────────
router.delete('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide'),
  requireRole('ADMIN', 'DENTIST')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    let whereClause = { id: req.params.id };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    await patient.update({ is_active: false });

    try {
      await AuditLog.create({
        user_id: getUserId(req),
        action: 'DELETE',
        resource_type: 'patients',
        resource_id: patient.id,
        old_values: patient.toJSON(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        description: `Patient désactivé: ${patient.first_name} ${patient.last_name}`
      });
    } catch (auditErr) { console.error('Audit log error:', auditErr); }

    res.json({ message: 'Patient désactivé avec succès' });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du patient', message: error.message });
  }
});

// ── GET /:id/dental-chart ────────────────────────────────────────────────────
router.get('/:id/dental-chart', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide')
], async (req, res) => {
  try {
    // ✅ Validation UUID — bloque 'undefined' et autres valeurs invalides
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ID patient invalide', details: errors.array() });
    }

    let whereClause = { id: req.params.id };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const treatments = await Treatment.findAll({
      where: { patient_id: req.params.id },
      order: [['treatment_date', 'DESC']]
    });

    // ✅ Format teeth_records en tableau (attendu par DentalChart.js)
    const teethMap = {};
    for (let i = 1; i <= 32; i++) {
      teethMap[i] = {
        tooth_position: String(i),
        status: 'healthy',
        procedures: [],
        notes: ''
      };
    }

    treatments.forEach(treatment => {
      if (treatment.tooth_numbers) {
        const toothNums = treatment.getToothNumbersArray
          ? treatment.getToothNumbersArray()
          : (Array.isArray(treatment.tooth_numbers)
              ? treatment.tooth_numbers
              : [treatment.tooth_numbers]);

        toothNums.forEach(toothNum => {
          const num = parseInt(toothNum);
          if (num >= 1 && num <= 32) {
            teethMap[num].procedures.push({
              procedure_type: treatment.procedure_type || 'restoration',
              procedure_name: treatment.procedure_name || treatment.procedure_id || '',
              cost_mga: treatment.cost_mga || 0,
              date_performed: treatment.treatment_date,
              description: treatment.treatment_notes || '',
              notes: ''
            });
            if (treatment.status === 'COMPLETED') {
              teethMap[num].status = 'filled';
            }
          }
        });
      }
    });

    res.json({
      patient_id: req.params.id,
      last_updated: new Date(),
      teeth_records: Object.values(teethMap)
    });
  } catch (error) {
    console.error('Get dental chart error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la fiche dentaire', message: error.message });
  }
});

// ── GET /:id/lab-orders ──────────────────────────────────────────────────────
router.get('/:id/lab-orders', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { LabOrder, Lab } = require('../models');

    let whereClause = { id: req.params.id };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const ordersWhere = { patient_id: req.params.id };
    if (req.clinic_id) ordersWhere.clinic_id = req.clinic_id;

    const orders = await LabOrder.findAll({
      where: ordersWhere,
      include: [
        { model: Lab,  as: 'lab',     attributes: ['id', 'name'], required: false },
        { model: User, as: 'dentist', attributes: ['id', 'full_name'], required: false }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      patient_id: req.params.id,
      count: orders.length,
      orders: orders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        work_type: o.work_type,
        status: o.status,
        due_date: o.due_date,
        total_mga: o.total_mga,
        lab: o.lab,
        dentist: o.dentist,
        created_at: o.createdAt
      }))
    });
  } catch (error) {
    console.error('Get patient lab orders error:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

module.exports = router;
