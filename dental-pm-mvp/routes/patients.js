const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { Patient, Treatment, Appointment, Invoice, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all patients
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, is_active = true } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = { is_active };
    
    if (search) {
      whereClause = {
        ...whereClause,
        $or: [
          { first_name: { $iLike: `%${search}%` } },
          { last_name: { $iLike: `%${search}%` } },
          { phone_primary: { $like: `%${search}%` } },
          { patient_number: { $like: `%${search}%` } }
        ]
      };
    }

    const { count, rows: patients } = await Patient.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['last_name', 'ASC'], ['first_name', 'ASC']],
      attributes: { exclude: ['created_by_user_id'] }
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
    console.error('Get patients error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des patients'
    });
  }
});

// Get single patient
router.get('/:id', [
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

    const patient = await Patient.findByPk(req.params.id, {
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

// Create new patient
router.post('/', [
  body('first_name')
    .isLength({ min: 1, max: 50 })
    .withMessage('Prénom requis (max 50 caractères)')
    .trim(),
  body('last_name')
    .isLength({ min: 1, max: 50 })
    .withMessage('Nom requis (max 50 caractères)')
    .trim(),
  body('date_of_birth')
    .isDate()
    .withMessage('Date de naissance invalide')
    .isBefore(new Date().toISOString())
    .withMessage('La date de naissance ne peut pas être dans le futur'),
  body('gender')
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Genre invalide'),
  body('phone_primary')
    .matches(/^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/)
    .withMessage('Numéro de téléphone malgache invalide'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('address')
    .isLength({ min: 10, max: 500 })
    .withMessage('Adresse requise (10-500 caractères)')
    .trim(),
  body('emergency_contact_name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nom du contact d\'urgence requis')
    .trim(),
  body('emergency_contact_phone')
    .matches(/^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/)
    .withMessage('Numéro de téléphone d\'urgence malgache invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    // Check if patient with same phone already exists
    const existingPatient = await Patient.findOne({
      where: { phone_primary: req.body.phone_primary }
    });

    if (existingPatient) {
      return res.status(409).json({
        error: 'Un patient avec ce numéro de téléphone existe déjà'
      });
    }

    const patient = await Patient.create({
      ...req.body,
      created_by_user_id: req.user.id
    });

    // Log patient creation
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'patients',
      resource_id: patient.id,
      new_values: req.body,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Nouveau patient créé: ${patient.getFullName()}`
    });

    res.status(201).json({
      message: 'Patient créé avec succès',
      patient
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du patient'
    });
  }
});

// Update patient
router.put('/:id', [
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

    const patient = await Patient.findByPk(req.params.id);
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

// Soft delete patient
router.delete('/:id', [
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

    const patient = await Patient.findByPk(req.params.id);
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

// Get patient dental chart (basic teeth status)
router.get('/:id/dental-chart', [
  param('id').isUUID().withMessage('ID patient invalide')
], async (req, res) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
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