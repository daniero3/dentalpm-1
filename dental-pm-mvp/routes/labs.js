const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Lab, LabOrder, LabOrderItem, LabDelivery, Patient, User, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// =============================================================================
// LAB MANAGEMENT
// =============================================================================

// Get all labs
router.get('/', [
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

// Get all lab orders with filtering
router.get('/orders', [
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

// Get single lab with orders
router.get('/:id', [
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

// Create new lab
router.post('/', [
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

    const lab = await Lab.create(req.body);

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

// =============================================================================
// LAB ORDERS MANAGEMENT
// =============================================================================

// Get all lab orders with filtering
router.get('/orders', [
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

// Get single lab order with full details
router.get('/orders/:id', [
  param('id').isUUID().withMessage('ID commande invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const order = await LabOrder.findByPk(req.params.id, {
      include: [
        {
          model: Lab,
          as: 'lab'
        },
        {
          model: Patient,
          as: 'patient'
        },
        {
          model: User,
          as: 'dentist'
        },
        {
          model: LabOrderItem,
          as: 'items'
        },
        {
          model: LabDelivery,
          as: 'delivery',
          required: false,
          include: [
            {
              model: User,
              as: 'receivedBy',
              attributes: ['id', 'full_name']
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        error: 'Commande laboratoire non trouvée'
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Get lab order error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la commande'
    });
  }
});

// Create new lab order
router.post('/orders', [
  requireRole('ADMIN', 'DENTIST'),
  body('patient_id').isUUID().withMessage('ID patient invalide'),
  body('lab_id').isUUID().withMessage('ID laboratoire invalide'),
  body('work_type').isIn(['CROWN', 'BRIDGE', 'DENTURE', 'PARTIAL_DENTURE', 'IMPLANT', 'ORTHODONTICS', 'REPAIR', 'OTHER']),
  body('due_date').isDate().withMessage('Date d\'échéance invalide'),
  body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  body('shade').optional().isLength({ max: 20 }).trim(),
  body('notes').optional().isLength({ max: 1000 }).trim(),
  body('items').isArray({ min: 1 }).withMessage('Au moins un élément requis'),
  body('items.*.tooth_number').optional().isLength({ max: 5 }).trim(),
  body('items.*.work_description').isLength({ min: 1, max: 255 }).trim(),
  body('items.*.unit_price_mga').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantité invalide'),
  body('items.*.material').optional().isLength({ max: 100 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { patient_id, lab_id, items, ...orderData } = req.body;

    // Validate patient exists
    const patient = await Patient.findByPk(patient_id);
    if (!patient) {
      return res.status(404).json({
        error: 'Patient non trouvé'
      });
    }

    // Validate lab exists
    const lab = await Lab.findByPk(lab_id);
    if (!lab) {
      return res.status(404).json({
        error: 'Laboratoire non trouvé'
      });
    }

    // Generate order number
    const currentYear = new Date().getFullYear();
    const orderCount = await LabOrder.count({
      where: {
        created_at: {
          [Op.gte]: new Date(currentYear, 0, 1),
          [Op.lt]: new Date(currentYear + 1, 0, 1)
        }
      }
    });
    const orderNumber = `LAB-${currentYear}-${String(orderCount + 1).padStart(4, '0')}`;

    // Calculate total from items
    const total_mga = items.reduce((sum, item) => {
      const subtotal = item.unit_price_mga * item.quantity;
      return sum + subtotal;
    }, 0);

    // Create lab order
    const labOrder = await LabOrder.create({
      order_number: orderNumber,
      patient_id,
      dentist_id: req.user.id,
      lab_id,
      total_mga,
      ...orderData
    });

    // Create order items
    const orderItems = [];
    for (const item of items) {
      const subtotal_mga = item.unit_price_mga * item.quantity;
      const orderItem = await LabOrderItem.create({
        lab_order_id: labOrder.id,
        subtotal_mga,
        ...item
      });
      orderItems.push(orderItem);
    }

    // Log order creation
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'lab_orders',
      resource_id: labOrder.id,
      new_values: { order_number: orderNumber, patient_id, lab_id, total_mga },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Nouvelle commande laboratoire créée: ${orderNumber} pour ${patient.first_name} ${patient.last_name}`
    });

    res.status(201).json({
      message: 'Commande laboratoire créée avec succès',
      order: {
        ...labOrder.toJSON(),
        items: orderItems
      }
    });
  } catch (error) {
    console.error('Create lab order error:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la commande'
    });
  }
});

// Update lab order status
router.put('/orders/:id/status', [
  param('id').isUUID().withMessage('ID commande invalide'),
  requireRole('ADMIN', 'DENTIST', 'ASSISTANT'),
  body('status').isIn(['CREATED', 'SENT', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']),
  body('notes').optional().isLength({ max: 500 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { status, notes } = req.body;
    
    const labOrder = await LabOrder.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    if (!labOrder) {
      return res.status(404).json({
        error: 'Commande laboratoire non trouvée'
      });
    }

    // Validate status transition
    if (labOrder.status === 'CANCELLED' && status !== 'CANCELLED') {
      return res.status(400).json({
        error: 'Impossible de modifier une commande annulée'
      });
    }

    if (labOrder.status === 'DELIVERED' && status !== 'DELIVERED') {
      return res.status(400).json({
        error: 'Impossible de modifier une commande livrée'
      });
    }

    const oldStatus = labOrder.status;
    const updateData = { status };

    // Update timestamps based on status
    if (status === 'SENT' && !labOrder.sent_at) {
      updateData.sent_at = new Date();
    } else if (status === 'DELIVERED' && !labOrder.delivered_at) {
      updateData.delivered_at = new Date();
    } else if (status === 'CANCELLED' && !labOrder.cancelled_at) {
      updateData.cancelled_at = new Date();
      if (notes) updateData.cancelled_reason = notes;
    }

    await labOrder.update(updateData);

    // Log status change
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      resource_type: 'lab_orders',
      resource_id: labOrder.id,
      old_values: { status: oldStatus },
      new_values: { status },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Statut commande ${labOrder.order_number} changé: ${oldStatus} → ${status}`
    });

    res.json({
      message: 'Statut de la commande mis à jour avec succès',
      order: {
        id: labOrder.id,
        order_number: labOrder.order_number,
        previous_status: oldStatus,
        new_status: status,
        patient: labOrder.patient
      }
    });
  } catch (error) {
    console.error('Update lab order status error:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du statut'
    });
  }
});

module.exports = router;