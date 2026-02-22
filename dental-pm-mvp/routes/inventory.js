const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Product, StockMovement, Supplier, User, AuditLog, sequelize } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// All routes require valid subscription
router.use(requireValidSubscription);

// Get all products with filtering - with clinic filtering
router.get('/products', requireClinicId, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(['INSTRUMENTS', 'CONSUMABLES', 'MATERIALS', 'EQUIPMENT', 'PROSTHETICS', 'ORTHODONTICS', 'HYGIENE', 'ANESTHESIA', 'RADIOLOGY', 'OTHER']),
  query('low_stock').optional().isBoolean(),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const { page = 1, limit = 20, category, low_stock, search, supplier_id } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = { is_active: true };
    
    // Apply clinic filtering
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }
    
    if (category) whereClause.category = category;
    if (supplier_id) whereClause.supplier_id = supplier_id;
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter for low stock items
    if (low_stock === 'true') {
      whereClause[Op.and] = [
        { current_qty: { [Op.lt]: { [Op.col]: 'min_qty' } } }
      ];
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    // Add computed fields
    const productsWithMetrics = products.map(product => ({
      ...product.toJSON(),
      is_low_stock: product.isLowStock(),
      margin_percentage: product.getMarginPercentage(),
      stock_value: product.getStockValue()
    }));

    res.json({
      products: productsWithMetrics,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des produits'
    });
  }
});

// Get single product with movements - with clinic check
router.get('/products/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID produit invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const product = await Product.findByPk(req.params.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier'
        },
        {
          model: StockMovement,
          as: 'movements',
          limit: 20,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'full_name']
            }
          ]
        }
      ]
    });

    if (!product) {
      return res.status(404).json({
        error: 'Produit non trouvé'
      });
    }

    // Log product view
    await AuditLog.create({
      user_id: req.user.id,
      action: 'VIEW',
      resource_type: 'products',
      resource_id: product.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Consultation produit: ${product.name}`
    });

    const productData = {
      ...product.toJSON(),
      is_low_stock: product.isLowStock(),
      margin_percentage: product.getMarginPercentage(),
      stock_value: product.getStockValue()
    };

    res.json(productData);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du produit'
    });
  }
});

// Create new product - with automatic clinic_id assignment
router.post('/products', requireClinicId, [
  requireRole('ADMIN', 'DENTIST'),
  body('name').isLength({ min: 1, max: 100 }).withMessage('Nom requis (max 100 caractères)').trim(),
  body('sku').isLength({ min: 1, max: 50 }).withMessage('SKU requis (max 50 caractères)').trim(),
  body('category').isIn(['INSTRUMENTS', 'CONSUMABLES', 'MATERIALS', 'EQUIPMENT', 'PROSTHETICS', 'ORTHODONTICS', 'HYGIENE', 'ANESTHESIA', 'RADIOLOGY', 'OTHER']),
  body('unit_cost_mga').isFloat({ min: 0 }).withMessage('Coût unitaire invalide'),
  body('sale_price_mga').isFloat({ min: 0 }).withMessage('Prix de vente invalide'),
  body('min_qty').isInt({ min: 0 }).withMessage('Quantité minimum invalide'),
  body('supplier_id').optional().isUUID().withMessage('ID fournisseur invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({
      where: { sku: req.body.sku }
    });

    if (existingProduct) {
      return res.status(409).json({
        error: 'Un produit avec ce SKU existe déjà'
      });
    }

    const product = await Product.create({
      ...req.body,
      clinic_id: req.clinic_id // Automatic clinic assignment
    });

    // Log product creation
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'products',
      resource_id: product.id,
      new_values: req.body,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Nouveau produit créé: ${product.name}`
    });

    res.status(201).json({
      message: 'Produit créé avec succès',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du produit'
    });
  }
});

// Update product - with clinic check
router.put('/products/:id', requireClinicId, [
  requireRole('ADMIN', 'DENTIST'),
  param('id').isUUID().withMessage('ID produit invalide'),
  body('name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('unit_cost_mga').optional().isFloat({ min: 0 }),
  body('sale_price_mga').optional().isFloat({ min: 0 }),
  body('min_qty').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({
        error: 'Produit non trouvé'
      });
    }

    const oldValues = product.toJSON();
    await product.update(req.body);

    // Log product update
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      resource_type: 'products',
      resource_id: product.id,
      old_values: oldValues,
      new_values: req.body,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Produit mis à jour: ${product.name}`
    });

    res.json({
      message: 'Produit mis à jour avec succès',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du produit'
    });
  }
});

// Record stock movement (IN/OUT/ADJUST) for specific product
router.post('/products/:id/movements', requireClinicId, [
  param('id').isUUID().withMessage('ID produit invalide'),
  body('type').isIn(['IN', 'OUT', 'ADJUST']).withMessage('Type invalide'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantité invalide'),
  body('reason').isLength({ min: 1, max: 255 }).withMessage('Motif requis').trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const product = await Product.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const { type, quantity, reason, reference } = req.body;
    const currentQty = product.current_qty;
    let newQty;

    switch (type) {
      case 'IN':
        newQty = currentQty + Math.abs(quantity);
        break;
      case 'OUT':
        newQty = currentQty - Math.abs(quantity);
        if (newQty < 0) {
          return res.status(400).json({ error: 'Stock insuffisant' });
        }
        break;
      case 'ADJUST':
        newQty = Math.abs(quantity);
        break;
    }

    const movement = await StockMovement.create({
      product_id: product.id,
      clinic_id: req.clinic_id,
      type,
      quantity: type === 'ADJUST' ? (newQty - currentQty) : (type === 'IN' ? Math.abs(quantity) : -Math.abs(quantity)),
      reason,
      reference: reference || null,
      user_id: req.user.id,
      previous_qty: currentQty,
      new_qty: newQty
    });

    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'stock_movements',
      resource_id: movement.id,
      new_values: { product_id: product.id, type, quantity, reason },
      ip_address: req.ip,
      description: `Mouvement ${type}: ${product.name} (${movement.quantity})`
    });

    res.status(201).json({
      message: 'Mouvement enregistré',
      movement: {
        id: movement.id,
        type: movement.type,
        quantity: movement.quantity,
        previous_qty: currentQty,
        new_qty: newQty
      },
      product: {
        id: product.id,
        name: product.name,
        current_qty: newQty
      }
    });
  } catch (error) {
    console.error('Product movement error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Record stock movement (IN/OUT/ADJUST) - with clinic check
router.post('/movements', requireClinicId, [
  requireRole('ADMIN', 'DENTIST', 'ASSISTANT'),
  body('product_id').isUUID().withMessage('ID produit invalide'),
  body('type').isIn(['IN', 'OUT', 'ADJUST']).withMessage('Type de mouvement invalide'),
  body('quantity').isInt().custom(value => {
    if (value === 0) throw new Error('La quantité ne peut pas être zéro');
    return true;
  }),
  body('reason').isLength({ min: 1, max: 255 }).withMessage('Motif requis').trim(),
  body('unit_cost_mga').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { product_id, type, quantity, reason, unit_cost_mga, reference, batch_number, expiry_date, notes } = req.body;

    // Get current product
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({
        error: 'Produit non trouvé'
      });
    }

    // Check permission for stock OUT
    if (type === 'OUT' && !['ADMIN', 'DENTIST', 'ASSISTANT'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Permission insuffisante pour les sorties de stock'
      });
    }

    const currentQty = product.current_qty;
    let newQty;

    // Calculate new quantity based on movement type
    switch (type) {
      case 'IN':
        newQty = currentQty + Math.abs(quantity);
        break;
      case 'OUT':
        newQty = Math.max(0, currentQty - Math.abs(quantity));
        if (newQty < 0) {
          return res.status(400).json({
            error: 'Stock insuffisant pour cette sortie'
          });
        }
        break;
      case 'ADJUST':
        newQty = Math.abs(quantity); // For adjustment, quantity is the new total
        break;
    }

    // Create movement record
    const movement = await StockMovement.create({
      product_id,
      type,
      quantity: type === 'ADJUST' ? (newQty - currentQty) : (type === 'IN' ? Math.abs(quantity) : -Math.abs(quantity)),
      unit_cost_mga,
      reason,
      reference,
      batch_number,
      expiry_date,
      notes,
      user_id: req.user.id,
      previous_qty: currentQty,
      new_qty: newQty
    });

    // Log movement
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'stock_movements',
      resource_id: movement.id,
      new_values: { product_id, type, quantity: movement.quantity, reason },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Mouvement de stock ${type}: ${product.name} (${movement.quantity})`
    });

    res.status(201).json({
      message: 'Mouvement de stock enregistré avec succès',
      movement,
      product: {
        id: product.id,
        name: product.name,
        previous_qty: currentQty,
        new_qty: newQty
      }
    });
  } catch (error) {
    console.error('Create stock movement error:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'enregistrement du mouvement'
    });
  }
});

// Get stock movements with filtering - with clinic filtering
router.get('/movements', requireClinicId, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('product_id').optional().isUUID(),
  query('type').optional().isIn(['IN', 'OUT', 'ADJUST']),
  query('start_date').optional().isDate(),
  query('end_date').optional().isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const { page = 1, limit = 20, product_id, type, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    
    if (product_id) whereClause.product_id = product_id;
    if (type) whereClause.type = type;
    if (start_date) whereClause.created_at = { [Op.gte]: start_date };
    if (end_date) {
      whereClause.created_at = {
        ...whereClause.created_at,
        [Op.lte]: end_date
      };
    }

    const { count, rows: movements } = await StockMovement.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'unit']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      movements,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get stock movements error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des mouvements'
    });
  }
});

// Get low stock alerts - with clinic filtering
router.get('/alerts', requireClinicId, async (req, res) => {
  try {
    let whereClause = {
      is_active: true,
      [Op.and]: sequelize.where(
        sequelize.col('current_qty'),
        Op.lte,
        sequelize.col('min_qty')
      )
    };
    
    // Apply clinic filtering
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }
    
    const lowStockProducts = await Product.findAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone', 'email']
        }
      ],
      order: [['current_qty', 'ASC'], ['name', 'ASC']]
    });

    const alertsWithMetrics = lowStockProducts.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      current_qty: product.current_qty,
      min_qty: product.min_qty,
      shortage: product.min_qty - product.current_qty,
      urgency_level: product.current_qty === 0 ? 'CRITICAL' : 
                    product.current_qty < (product.min_qty / 2) ? 'HIGH' : 'MEDIUM',
      supplier: product.supplier
    }));

    res.json({
      alerts: alertsWithMetrics,
      total_alerts: alertsWithMetrics.length,
      critical_alerts: alertsWithMetrics.filter(p => p.urgency_level === 'CRITICAL').length
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Erreur récupération alertes' });
  }
});

// Get low stock alerts - legacy endpoint
router.get('/low-stock', requireClinicId, async (req, res) => {
  try {
    let whereClause = {
      is_active: true,
      current_qty: {
        [Op.lt]: { [Op.col]: 'min_qty' }
      }
    };
    
    // Apply clinic filtering
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }
    
    const lowStockProducts = await Product.findAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone', 'email']
        }
      ],
      order: [
        [sequelize.literal('(current_qty - min_qty)'), 'ASC'], // Most critical first
        ['name', 'ASC']
      ]
    });

    const alertsWithMetrics = lowStockProducts.map(product => ({
      ...product.toJSON(),
      shortage: product.min_qty - product.current_qty,
      urgency_level: product.current_qty === 0 ? 'CRITICAL' : 
                    product.current_qty < (product.min_qty / 2) ? 'HIGH' : 'MEDIUM'
    }));

    res.json({
      alerts: alertsWithMetrics,
      total_alerts: alertsWithMetrics.length,
      critical_alerts: alertsWithMetrics.filter(p => p.urgency_level === 'CRITICAL').length
    });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des alertes de stock'
    });
  }
});

module.exports = router;