const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Lab, LabOrder, LabOrderItem, LabDelivery, Patient, User, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// All routes require valid subscription
router.use(requireValidSubscription);

// =============================================================================
// LAB MANAGEMENT
// =============================================================================

// Get all labs - with clinic filtering
router.get('/', requireClinicId, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isLength({ max: 100 }),
  query('city').optional().isLength({ max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const { page = 1, limit = 20, search, city } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = { is_active: true };
    
    // Apply clinic filtering
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }
    
    if (city) whereClause.city = city;
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { contact_person: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: labs } = await Lab.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: LabOrder,
          as: 'orders',
          attributes: ['id'],
          where: { status: { [Op.ne]: 'CANCELLED' } },
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    // Add computed fields
    const labsWithMetrics = labs.map(lab => ({
      ...lab.toJSON(),
      orders_count: lab.orders?.length || 0
    }));

    res.json({
      labs: labsWithMetrics,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get labs error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des laboratoires'
    });
  }
});

// =============================================================================
// LAB ORDERS MANAGEMENT
// =============================================================================

// Get all lab orders with filtering - with clinic filtering
router.get('/orders', requireClinicId, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['CREATED', 'SENT', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']),
  query('lab_id').optional().isUUID(),
  query('dentist_id').optional().isUUID(),
  query('work_type').optional().isIn(['CROWN', 'BRIDGE', 'DENTURE', 'PARTIAL_DENTURE', 'IMPLANT', 'ORTHODONTICS', 'REPAIR', 'OTHER']),
  query('due_date_from').optional().isDate(),
  query('due_date_to').optional().isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const { 
      page = 1, 
      limit = 20, 
      status, 
      lab_id, 
      dentist_id, 
      work_type,
      due_date_from,
      due_date_to 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = {};
    
    // Apply clinic filtering
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }
    
    if (status) whereClause.status = status;
    if (lab_id) whereClause.lab_id = lab_id;
    if (dentist_id) whereClause.dentist_id = dentist_id;
    if (work_type) whereClause.work_type = work_type;
    
    if (due_date_from || due_date_to) {
      whereClause.due_date = {};
      if (due_date_from) whereClause.due_date[Op.gte] = due_date_from;
      if (due_date_to) whereClause.due_date[Op.lte] = due_date_to;
    }

    const { count, rows: orders } = await LabOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Lab,
          as: 'lab',
          attributes: ['id', 'name', 'phone', 'lead_time_days']
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'phone_primary']
        },
        {
          model: User,
          as: 'dentist',
          attributes: ['id', 'full_name', 'phone']
        },
        {
          model: LabOrderItem,
          as: 'items',
          attributes: ['id', 'tooth_number', 'work_description', 'unit_price_mga', 'quantity', 'subtotal_mga']
        },
        {
          model: LabDelivery,
          as: 'delivery',
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['due_date', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      orders,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get lab orders error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des commandes laboratoire'
    });
  }
});

// Get single lab with orders - with clinic check
router.get('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID laboratoire invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const lab = await Lab.findByPk(req.params.id, {
      include: [
        {
          model: LabOrder,
          as: 'orders',
          limit: 10,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['id', 'first_name', 'last_name']
            },
            {
              model: User,
              as: 'dentist',
              attributes: ['id', 'full_name']
            }
          ]
        }
      ]
    });

    if (!lab) {
      return res.status(404).json({
        error: 'Laboratoire non trouvé'
      });
    }

    res.json(lab);
  } catch (error) {
    console.error('Get lab error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du laboratoire'
    });
  }
});

// Create new lab - with automatic clinic_id assignment
router.post('/', requireClinicId, [
  requireRole('ADMIN', 'DENTIST'),
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Nom requis (max 100 caractères)')
    .trim(),
  body('phone')
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
  body('city')
    .isLength({ min: 2, max: 50 })
    .withMessage('Ville requise')
    .trim(),
  body('specialties')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Spécialités trop longues (max 500 caractères)')
    .trim(),
  body('lead_time_days')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('Délai invalide (1-60 jours)'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Note invalide (1-5)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    // Check if lab with same name already exists
    const existingLab = await Lab.findOne({
      where: { name: req.body.name }
    });

    if (existingLab) {
      return res.status(409).json({
        error: 'Un laboratoire avec ce nom existe déjà'
      });
    }

    const lab = await Lab.create({
      ...req.body,
      clinic_id: req.clinic_id // Automatic clinic assignment
    });

    // Log lab creation
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'labs',
      resource_id: lab.id,
      new_values: req.body,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Nouveau laboratoire créé: ${lab.name}`
    });

    res.status(201).json({
      message: 'Laboratoire créé avec succès',
      lab
    });
  } catch (error) {
    console.error('Create lab error:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du laboratoire'
    });
  }
});

module.exports = router;