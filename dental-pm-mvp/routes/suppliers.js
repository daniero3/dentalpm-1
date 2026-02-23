const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Supplier, Product, StockMovement, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');
const { auditLogger } = require('../middleware/auditLogger');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// All routes require valid subscription
router.use(requireValidSubscription);

// Audit logging
router.use(auditLogger('suppliers'));

// Get all suppliers - with clinic filtering + auto-seed
router.get('/', requireClinicId, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('type').optional().isString(),
  query('city').optional().isString(),
  query('active').optional().isIn(['true', 'false', 'all'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    // Auto-seed if no suppliers exist for this clinic
    await Supplier.seedForClinic(req.clinic_id);

    const { page = 1, limit = 50, search, type, city, active = 'true' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = { clinic_id: req.clinic_id };
    
    // Filter by active status
    if (active !== 'all') {
      whereClause.is_active = active === 'true';
    }
    
    if (type) whereClause.type = type;
    if (city) whereClause.city = city;
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { contact_person: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: suppliers } = await Supplier.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    // Add computed fields
    const suppliersWithMetrics = suppliers.map(supplier => ({
      ...supplier.toJSON(),
      performance_score: supplier.getPerformanceScore()
    }));

    res.json({
      suppliers: suppliersWithMetrics,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des fournisseurs'
    });
  }
});

// Get single supplier with products - with clinic check
router.get('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID fournisseur invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const supplier = await Supplier.findByPk(req.params.id, {
      include: [
        {
          model: Product,
          as: 'products',
          where: { is_active: true },
          required: false
        }
      ]
    });

    if (!supplier) {
      return res.status(404).json({
        error: 'Fournisseur non trouvé'
      });
    }

    // Calculate supplier KPIs
    const supplierData = {
      ...supplier.toJSON(),
      performance_score: supplier.getPerformanceScore(),
      products_count: supplier.products?.length || 0,
      total_stock_value: supplier.products?.reduce((sum, product) => 
        sum + (product.current_qty * product.unit_cost_mga), 0) || 0
    };

    res.json(supplierData);
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du fournisseur'
    });
  }
});

// Create new supplier - with automatic clinic_id assignment
router.post('/', requireClinicId, [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Nom requis (max 100 caractères)').trim(),
  body('type').optional().isIn(['DENTAL', 'PHARMA', 'EQUIPMENT', 'GENERAL']).withMessage('Type invalide'),
  body('phone').optional().isString(),
  body('email').optional().isEmail().withMessage('Email invalide').normalizeEmail(),
  body('city').optional().isString(),
  body('address').optional().isString(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    // Check if supplier with same name already exists in this clinic
    const existingSupplier = await Supplier.findOne({
      where: { name: req.body.name, clinic_id: req.clinic_id }
    });

    if (existingSupplier) {
      return res.status(409).json({
        error: 'Un fournisseur avec ce nom existe déjà'
      });
    }

    const supplier = await Supplier.create({
      ...req.body,
      clinic_id: req.clinic_id,
      is_active: true
    });

    // Log supplier creation
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'suppliers',
      resource_id: supplier.id,
      new_values: req.body,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Nouveau fournisseur créé: ${supplier.name}`
    });

    res.status(201).json({
      message: 'Fournisseur créé avec succès',
      supplier
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du fournisseur'
    });
  }
});

// Update supplier - with clinic check
router.put('/:id', requireClinicId, [
  requireRole('ADMIN', 'ACCOUNTANT'),
  param('id').isUUID().withMessage('ID fournisseur invalide'),
  body('name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('phone').optional().matches(/^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/),
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

    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({
        error: 'Fournisseur non trouvé'
      });
    }

    const oldValues = supplier.toJSON();
    await supplier.update(req.body);

    // Log supplier update
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      resource_type: 'suppliers',
      resource_id: supplier.id,
      old_values: oldValues,
      new_values: req.body,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Fournisseur mis à jour: ${supplier.name}`
    });

    res.json({
      message: 'Fournisseur mis à jour avec succès',
      supplier
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du fournisseur'
    });
  }
});

// Get supplier products - with clinic check
router.get('/:id/products', requireClinicId, [
  param('id').isUUID().withMessage('ID fournisseur invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({
        error: 'Fournisseur non trouvé'
      });
    }

    const products = await Product.findAll({
      where: {
        supplier_id: req.params.id,
        is_active: true
      },
      order: [['name', 'ASC']]
    });

    const productsWithMetrics = products.map(product => ({
      ...product.toJSON(),
      is_low_stock: product.isLowStock(),
      stock_value: product.getStockValue(),
      margin_percentage: product.getMarginPercentage()
    }));

    res.json({
      supplier: {
        id: supplier.id,
        name: supplier.name
      },
      products: productsWithMetrics,
      total_products: productsWithMetrics.length,
      total_stock_value: productsWithMetrics.reduce((sum, p) => sum + p.stock_value, 0),
      low_stock_count: productsWithMetrics.filter(p => p.is_low_stock).length
    });
  } catch (error) {
    console.error('Get supplier products error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des produits du fournisseur'
    });
  }
});

// Soft delete supplier - with clinic check
router.delete('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID fournisseur invalide'),
  requireRole('ADMIN')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({
        error: 'Fournisseur non trouvé'
      });
    }

    // Check if supplier has products
    const productCount = await Product.count({
      where: { supplier_id: supplier.id, is_active: true }
    });

    if (productCount > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer: ${productCount} produit(s) associé(s) à ce fournisseur`
      });
    }

    await supplier.update({ is_active: false });

    // Log supplier deletion
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE',
      resource_type: 'suppliers',
      resource_id: supplier.id,
      old_values: supplier.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Fournisseur désactivé: ${supplier.name}`
    });

    res.json({
      message: 'Fournisseur désactivé avec succès'
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du fournisseur'
    });
  }
});

module.exports = router;