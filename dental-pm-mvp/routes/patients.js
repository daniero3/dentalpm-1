const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Patient, Treatment, Appointment, Invoice, AuditLog, User, sequelize } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { auditLogger } = require('../middleware/auditLogger');
const { requireValidSubscription } = require('../middleware/licensing');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authenticateToken);
router.use(requireValidSubscription);
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

    let whereClause = {};
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

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
        user_id: req.user.id,
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

    // Normalize gender
    let gender = (req.body.gender || '').toString().toLowerCase().trim();
    if (['m', 'male', 'homme', 'masculin'].includes(gender)) gender = 'M';
    else if (['f', 'female', 'femme', 'féminin', 'feminin'].includes(gender)) gender = 'F';
    else return res.status(400).json({ error: 'Genre invalide', message: 'Le genre doit être M ou F' });

    // SUPER_ADMIN: clinic_id peut être null ou spécifié dans le body
    const clinicId = req.clinic_id || req.body.clinic_id || null;

    // Generate patient number — PostgreSQL compatible
    let patient_number = null;
    try {
      if (clinicId) {
        // Upsert counter using PostgreSQL syntax
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
        // SUPER_ADMIN sans clinique: numéro basé sur timestamp
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
      created_by_user_id: req.user.id,
      emergency_contact_name:  req.body.emergency_contact_name  || null,
      emergency_contact_phone: req.body.emergency_contact_phone || null,
      payer_type: req.body.payer_type || 'CASH',
    };

    // Remove fields that don't belong to Patient model
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
        user_id: req.user.id,
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
        user_id: req.user.id,
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
    let whereClause = { id: req.params.id };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const treatments = await Treatment.findAll({
      where: { patient_id: req.params.id },
      order: [['treatment_date', 'DESC']]
    });

    const dentalChart = { patient_id: req.params.id, last_updated: new Date(), teeth: {} };
    for (let i = 1; i <= 32; i++) {
      dentalChart.teeth[i] = { tooth_number: i, status: 'HEALTHY', treatments: [], notes: '' };
    }

    treatments.forEach(treatment => {
      if (treatment.tooth_numbers) {
        const toothNums = treatment.getToothNumbersArray ? treatment.getToothNumbersArray() : [];
        toothNums.forEach(toothNum => {
          const num = parseInt(toothNum);
          if (num >= 1 && num <= 32) {
            dentalChart.teeth[num].treatments.push({
              id: treatment.id,
              date: treatment.treatment_date,
              procedure: treatment.procedure_id,
              status: treatment.status,
              notes: treatment.treatment_notes
            });
          }
        });
      }
    });

    res.json(dentalChart);
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
