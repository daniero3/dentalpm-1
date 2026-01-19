const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Patient, Treatment, Appointment, Invoice, AuditLog, User, sequelize } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { auditLogger } = require('../middleware/auditLogger');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Audit logging for write operations
router.use(auditLogger('patients'));

// List patients (avec filtrage clinic_id)
router.get('/', requireClinicId, [
  query('search').optional().isLength({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres de recherche invalides',
        details: errors.array()
      });
    }

    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause with clinic filtering
    let whereClause = {};
    
    // Super admin can see all patients, others filtered by clinic
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }

    if (search) {
      whereClause[Op.or] = [
        { patient_number: { [Op.like]: `%${search}%` } },
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { phone_primary: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
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
        attributes: { exclude: ['password_hash'] }
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
    res.status(500).json({
      error: 'Erreur lors de la récupération des patients'
    });
  }
});

// Get single patient - with clinic check
router.get('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    // Build where clause with clinic filtering
    let whereClause = { id: req.params.id };
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }

    const patient = await Patient.findOne({
      where: whereClause,
      include: [
        {
          model: Appointment,
          as: 'appointments',
          limit: 5,
          order: [['appointment_date', 'DESC']]
        },
        {
          model: Treatment,
          as: 'treatments',
          limit: 10,
          order: [['treatment_date', 'DESC']]
        },
        {
          model: Invoice,
          as: 'invoices',
          limit: 5,
          order: [['invoice_date', 'DESC']]
        }
      ]
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient non trouvé'
      });
    }

    // Log patient view
    await AuditLog.create({
      user_id: req.user.id,
      action: 'VIEW',
      resource_type: 'patients',
      resource_id: patient.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Consultation fiche patient: ${patient.getFullName()}`
    });

    res.json(patient);
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du patient'
    });
  }
});

// Create patient (avec clinic_id automatique)
router.post('/', requireClinicId, [
  body('first_name').isLength({ min: 2, max: 50 }).withMessage('Prénom requis (2-50 caractères)'),
  body('last_name').isLength({ min: 2, max: 50 }).withMessage('Nom requis (2-50 caractères)'),
  body('date_of_birth').isISO8601().withMessage('Date de naissance invalide (format YYYY-MM-DD)'),
  body('gender').notEmpty().withMessage('Genre requis (M/F/male/female/homme/femme)'),
  body('phone_primary').matches(/^\+?261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$|^\d{10}$|^\+\d{10,15}$/).withMessage('Numéro de téléphone invalide'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalide'),
  body('address').optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }).withMessage('Adresse trop longue'),
  body('city').optional({ nullable: true, checkFalsy: true }).isLength({ max: 50 }).withMessage('Ville trop longue'),
  body('postal_code').optional({ nullable: true, checkFalsy: true }).isLength({ max: 10 }).withMessage('Code postal invalide'),
  body('nif_number').optional({ nullable: true, checkFalsy: true }).isLength({ max: 20 }).withMessage('Numéro NIF invalide'),
  body('stat_number').optional({ nullable: true, checkFalsy: true }).isLength({ max: 20 }).withMessage('Numéro STAT invalide'),
  body('emergency_contact_name').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }),
  body('emergency_contact_phone').optional({ nullable: true, checkFalsy: true }).matches(/^\+?261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$|^\d{10}$|^\+\d{10,15}$|^$/),
  body('medical_history').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }),
  body('allergies').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 }),
  body('current_medications').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    // Normalize gender to M/F only
    let gender = (req.body.gender || '').toString().toLowerCase().trim();
    if (['m', 'male', 'homme', 'masculin'].includes(gender)) {
      gender = 'M';
    } else if (['f', 'female', 'femme', 'féminin', 'feminin'].includes(gender)) {
      gender = 'F';
    } else {
      return res.status(400).json({
        error: 'Genre invalide',
        message: 'Le genre doit être M, F, male, female, homme ou femme'
      });
    }

    // Check clinic_id is available
    if (!req.clinic_id) {
      return res.status(400).json({
        error: 'clinic_id requis',
        message: 'Utilisateur non assigné à une clinique'
      });
    }

    // Generate patient_number with DB counter (PAT-XXXXXX per clinic)
    const [counterResult] = await sequelize.query(`
      INSERT INTO counters (id, clinic_id, counter_type, current_value, created_at, updated_at)
      VALUES (lower(hex(randomblob(16))), '${req.clinic_id}', 'patient', 1, datetime('now'), datetime('now'))
      ON CONFLICT(clinic_id, counter_type) DO UPDATE SET 
        current_value = current_value + 1,
        updated_at = datetime('now')
      RETURNING current_value
    `);
    const counterValue = counterResult[0]?.current_value || 1;
    const patient_number = `PAT-${String(counterValue).padStart(6, '0')}`;

    const patientData = {
      ...req.body,
      patient_number,
      gender,
      clinic_id: req.clinic_id,
      created_by_user_id: req.user.id,
      // Set empty strings to null for optional fields
      emergency_contact_name: req.body.emergency_contact_name || null,
      emergency_contact_phone: req.body.emergency_contact_phone || null
    };

    const patient = await Patient.create(patientData);

    res.status(201).json({
      message: 'Patient créé avec succès',
      patient
    });

  } catch (error) {
    console.error('Create patient error:', error);
    
    // Return detailed error for debugging
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Erreur de validation',
        details: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    res.status(500).json({
      error: 'Erreur lors de la création du patient',
      message: error.message
    });
  }
});

// Update patient - with clinic check
router.put('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide'),
  body('first_name').optional().isLength({ min: 1, max: 50 }).trim(),
  body('last_name').optional().isLength({ min: 1, max: 50 }).trim(),
  body('phone_primary').optional().matches(/^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('address').optional().isLength({ min: 10, max: 500 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    // Build where clause with clinic filtering
    let whereClause = { id: req.params.id };
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }

    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) {
      return res.status(404).json({
        error: 'Patient non trouvé'
      });
    }

    const oldValues = patient.toJSON();
    await patient.update(req.body);

    // Log patient update
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      resource_type: 'patients',
      resource_id: patient.id,
      old_values: oldValues,
      new_values: req.body,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Patient mis à jour: ${patient.getFullName()}`
    });

    res.json({
      message: 'Patient mis à jour avec succès',
      patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du patient'
    });
  }
});

// Soft delete patient - with clinic check
router.delete('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide'),
  requireRole('ADMIN', 'DENTIST')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    // Build where clause with clinic filtering
    let whereClause = { id: req.params.id };
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }

    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) {
      return res.status(404).json({
        error: 'Patient non trouvé'
      });
    }

    await patient.update({ is_active: false });

    // Log patient deletion
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE',
      resource_type: 'patients',
      resource_id: patient.id,
      old_values: patient.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Patient désactivé: ${patient.getFullName()}`
    });

    res.json({
      message: 'Patient désactivé avec succès'
    });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du patient'
    });
  }
});

// Get patient dental chart (basic teeth status) - with clinic check
router.get('/:id/dental-chart', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide')
], async (req, res) => {
  try {
    // Build where clause with clinic filtering
    let whereClause = { id: req.params.id };
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }
    
    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) {
      return res.status(404).json({
        error: 'Patient non trouvé'
      });
    }

    // Get treatments grouped by tooth
    const treatments = await Treatment.findAll({
      where: { patient_id: req.params.id },
      order: [['treatment_date', 'DESC']]
    });

    // Basic dental chart with 32 teeth
    const dentalChart = {
      patient_id: req.params.id,
      last_updated: new Date(),
      teeth: {}
    };

    // Initialize all 32 teeth
    for (let i = 1; i <= 32; i++) {
      dentalChart.teeth[i] = {
        tooth_number: i,
        status: 'HEALTHY',
        treatments: [],
        notes: ''
      };
    }

    // Populate with treatment data
    treatments.forEach(treatment => {
      if (treatment.tooth_numbers) {
        const toothNums = treatment.getToothNumbersArray();
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
    res.status(500).json({
      error: 'Erreur lors de la récupération de la fiche dentaire'
    });
  }
});

module.exports = router;