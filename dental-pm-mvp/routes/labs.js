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

// =============================================================================
// LAB ORDERS - EXTENDED API
// =============================================================================

// Get single lab order
router.get('/orders/:id', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const order = await LabOrder.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id },
      include: [
        { model: Lab, as: 'lab' },
        { model: Patient, as: 'patient' },
        { model: User, as: 'dentist', attributes: ['id', 'full_name', 'username'] },
        { model: LabOrderItem, as: 'items' }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create lab order (simplified)
router.post('/orders', requireClinicId, [
  body('patient_id').isUUID(),
  body('work_type').isIn(['CROWN', 'BRIDGE', 'PARTIAL_DENTURE', 'COMPLETE_DENTURE', 'IMPLANT_CROWN', 'ORTHODONTIC_APPLIANCE', 'NIGHT_GUARD', 'VENEER', 'INLAY_ONLAY', 'OTHER']),
  body('due_date').isDate(),
  body('lab_name').optional().isString(),
  body('teeth_fdi').optional().isString(),
  body('material').optional().isString(),
  body('shade').optional().isString(),
  body('lab_cost_mga').optional().isFloat({ min: 0 }),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const patient = await Patient.findOne({
      where: { id: req.body.patient_id, clinic_id: req.clinic_id }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    // Find or create a default lab
    let [defaultLab] = await Lab.findOrCreate({
      where: { clinic_id: req.clinic_id, name: req.body.lab_name || 'Laboratoire par défaut' },
      defaults: {
        clinic_id: req.clinic_id,
        name: req.body.lab_name || 'Laboratoire par défaut',
        phone: '+261 00 00 000 00',
        address: 'Adresse non spécifiée',
        city: 'Antananarivo'
      }
    });

    // Generate order number
    const count = await LabOrder.count({ where: { clinic_id: req.clinic_id } });
    const orderNumber = `LAB-${String(count + 1).padStart(6, '0')}`;

    const order = await LabOrder.create({
      order_number: orderNumber,
      clinic_id: req.clinic_id,
      patient_id: req.body.patient_id,
      dentist_id: req.user.id,
      lab_id: defaultLab.id,
      work_type: req.body.work_type,
      due_date: req.body.due_date,
      shade: req.body.shade || null,
      total_mga: req.body.lab_cost_mga || 0,
      notes: req.body.notes || null,
      status: 'CREATED'
    });

    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'lab_orders',
      resource_id: order.id,
      new_values: req.body,
      ip_address: req.ip,
      description: `Commande labo créée: ${order.order_number}`
    });

    res.status(201).json({
      message: 'Commande créée',
      order: {
        id: order.id,
        order_number: order.order_number,
        work_type: order.work_type,
        status: order.status,
        due_date: order.due_date
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// Update lab order
router.put('/orders/:id', requireClinicId, [
  param('id').isUUID(),
  body('work_type').optional().isIn(['CROWN', 'BRIDGE', 'PARTIAL_DENTURE', 'COMPLETE_DENTURE', 'IMPLANT_CROWN', 'ORTHODONTIC_APPLIANCE', 'NIGHT_GUARD', 'VENEER', 'INLAY_ONLAY', 'OTHER']),
  body('due_date').optional().isDate(),
  body('shade').optional().isString(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const order = await LabOrder.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      return res.status(409).json({ error: 'Commande non modifiable' });
    }

    await order.update(req.body);

    res.json({ message: 'Commande mise à jour', order });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Change lab order status
router.post('/orders/:id/status', requireClinicId, [
  param('id').isUUID(),
  body('status').isIn(['CREATED', 'SENT', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']),
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const order = await LabOrder.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const { status, reason } = req.body;
    const updates = { status };

    if (status === 'SENT') updates.sent_at = new Date();
    if (status === 'DELIVERED') updates.delivered_at = new Date();
    if (status === 'CANCELLED') {
      updates.cancelled_at = new Date();
      updates.cancelled_reason = reason || null;
    }

    await order.update(updates);

    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      resource_type: 'lab_orders',
      resource_id: order.id,
      new_values: { status, reason },
      ip_address: req.ip,
      description: `Statut commande ${order.order_number}: ${status}`
    });

    res.json({
      message: 'Statut mis à jour',
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Status change error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get lab orders for a patient
router.get('/patient/:patientId/orders', requireClinicId, [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { id: req.params.patientId, clinic_id: req.clinic_id }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const orders = await LabOrder.findAll({
      where: { patient_id: req.params.patientId, clinic_id: req.clinic_id },
      include: [
        { model: Lab, as: 'lab', attributes: ['id', 'name'] },
        { model: User, as: 'dentist', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      patient_id: req.params.patientId,
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
    console.error('Get patient orders error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Print lab order (HTML)
router.get('/orders/:id/print', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const order = await LabOrder.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id },
      include: [
        { model: Lab, as: 'lab' },
        { model: Patient, as: 'patient' },
        { model: User, as: 'dentist' }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Commande Labo ${order.order_number}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
    .label { font-weight: bold; color: #666; }
    .value { margin-top: 5px; }
    .status { display: inline-block; padding: 5px 10px; border-radius: 3px; background: #e0e0e0; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>COMMANDE LABORATOIRE</h1>
  <p><strong>N°:</strong> ${order.order_number} | <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
  
  <div class="info">
    <div class="box">
      <div class="label">Patient</div>
      <div class="value">${order.patient.first_name} ${order.patient.last_name}</div>
    </div>
    <div class="box">
      <div class="label">Laboratoire</div>
      <div class="value">${order.lab?.name || 'Non spécifié'}</div>
    </div>
  </div>
  
  <div class="box">
    <div class="label">Type de travail</div>
    <div class="value">${order.work_type}</div>
    ${order.shade ? `<p><strong>Teinte:</strong> ${order.shade}</p>` : ''}
    ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
  </div>
  
  <p><strong>Date limite:</strong> ${new Date(order.due_date).toLocaleDateString('fr-FR')}</p>
  <p><strong>Statut:</strong> <span class="status">${order.status}</span></p>
  <p><strong>Montant:</strong> ${Number(order.total_mga).toLocaleString()} MGA</p>
  
  <hr style="margin-top: 40px;">
  <p><strong>Praticien:</strong> ${order.dentist?.full_name || 'N/A'}</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Print order error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;