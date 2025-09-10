const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Product, StockMovement, Supplier, User, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all products with filtering
router.get('/products', [
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

// Get single product with movements
router.get('/products/:id', [
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

// Create new product
router.post('/products', [
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

    const product = await Product.create(req.body);

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

// Update product
router.put('/products/:id', [
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

// Record stock movement (IN/OUT/ADJUST)
router.post('/movements', [
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

// Get stock movements with filtering
router.get('/movements', [
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

// Get low stock alerts
router.get('/low-stock', async (req, res) => {
  try {
    const lowStockProducts = await Product.findAll({
      where: {
        is_active: true,
        current_qty: {
          [Op.lte]: sequelize.col('min_qty')
        }
      },
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