const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Supplier, Product, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authenticateToken);
router.use(requireValidSubscription);

// Helper: clause WHERE selon le rôle
const clinicWhere = (req, extra = {}) => {
  if (req.user?.role === 'SUPER_ADMIN') return extra;
  if (req.clinic_id) return { clinic_id: req.clinic_id, ...extra };
  return extra;
};

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', requireClinicId, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, type, city, active = 'true' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Auto-seed seulement si clinic_id existe (pas SUPER_ADMIN)
    if (req.clinic_id && typeof Supplier.seedForClinic === 'function') {
      try { await Supplier.seedForClinic(req.clinic_id); } catch(e) {}
    }

    const where = clinicWhere(req);
    if (active !== 'all') where.is_active = active === 'true';
    if (type) where.type = type;
    if (city) where.city = city;
    if (search) {
      where[Op.or] = [
        { name:           { [Op.like]: `%${search}%` } },
        { contact_person: { [Op.like]: `%${search}%` } },
        { phone:          { [Op.like]: `%${search}%` } },
        { email:          { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: suppliers } = await Supplier.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['name', 'ASC']]
    });

    const suppliersWithMetrics = suppliers.map(s => ({
      ...s.toJSON(),
      performance_score: typeof s.getPerformanceScore === 'function' ? s.getPerformanceScore() : 0
    }));

    res.json({
      suppliers: suppliersWithMetrics,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / parseInt(limit)),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fournisseurs', message: error.message });
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      where: { id: req.params.id, ...clinicWhere(req) },
      include: [{ model: Product, as: 'products', where: { is_active: true }, required: false }]
    });
    if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });

    res.json({
      ...supplier.toJSON(),
      performance_score: typeof supplier.getPerformanceScore === 'function' ? supplier.getPerformanceScore() : 0,
      products_count: supplier.products?.length || 0,
      total_stock_value: supplier.products?.reduce((sum, p) => sum + (p.current_qty * p.unit_cost_mga), 0) || 0
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du fournisseur', message: error.message });
  }
});

// ── POST / ────────────────────────────────────────────────────────────────────
router.post('/', requireClinicId, [
  body('name').isLength({ min: 1, max: 100 }).trim(),
  body('type').optional().isIn(['DENTAL', 'PHARMA', 'EQUIPMENT', 'GENERAL']),
  body('phone').optional().isString(),
  body('email').optional().isEmail().normalizeEmail(),
  body('city').optional().isString(),
  body('address').optional().isString(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    // Vérifier doublon (seulement si clinic_id)
    const dupWhere = { name: req.body.name, ...clinicWhere(req) };
    const existing = await Supplier.findOne({ where: dupWhere });
    if (existing) return res.status(409).json({ error: 'Un fournisseur avec ce nom existe déjà' });

    const supplier = await Supplier.create({
      ...req.body,
      clinic_id: req.clinic_id || null,
      is_active: true
    });

    try {
      await AuditLog.create({
        user_id: req.user.id, action: 'CREATE', resource_type: 'suppliers',
        resource_id: supplier.id, new_values: req.body, ip_address: req.ip,
        description: `Nouveau fournisseur créé: ${supplier.name}`
      });
    } catch(e) {}

    res.status(201).json({ message: 'Fournisseur créé avec succès', supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du fournisseur', message: error.message });
  }
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────
router.put('/:id', requireClinicId, [
  param('id').isUUID(),
  body('name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('type').optional().isIn(['DENTAL', 'PHARMA', 'EQUIPMENT', 'GENERAL']),
  body('phone').optional().isString(),
  body('email').optional().isEmail().normalizeEmail(),
  body('city').optional().isString(),
  body('address').optional().isString(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    const supplier = await Supplier.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });

    const oldValues = supplier.toJSON();
    await supplier.update(req.body);

    try {
      await AuditLog.create({
        user_id: req.user.id, action: 'UPDATE', resource_type: 'suppliers',
        resource_id: supplier.id, old_values: oldValues, new_values: req.body,
        ip_address: req.ip, description: `Fournisseur mis à jour: ${supplier.name}`
      });
    } catch(e) {}

    res.json({ message: 'Fournisseur mis à jour avec succès', supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du fournisseur', message: error.message });
  }
});

// ── PATCH /:id/disable ────────────────────────────────────────────────────────
router.patch('/:id/disable', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });

    await supplier.update({ is_active: false });
    res.json({ message: 'Fournisseur désactivé', supplier: { ...supplier.toJSON(), is_active: false } });
  } catch (error) {
    console.error('Disable supplier error:', error);
    res.status(500).json({ error: 'Erreur lors de la désactivation', message: error.message });
  }
});

// ── GET /:id/products ─────────────────────────────────────────────────────────
router.get('/:id/products', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });

    const products = await Product.findAll({
      where: { supplier_id: req.params.id, is_active: true },
      order: [['name', 'ASC']]
    });

    const productsWithMetrics = products.map(p => ({
      ...p.toJSON(),
      is_low_stock:       typeof p.isLowStock          === 'function' ? p.isLowStock()          : false,
      stock_value:        typeof p.getStockValue        === 'function' ? p.getStockValue()        : 0,
      margin_percentage:  typeof p.getMarginPercentage  === 'function' ? p.getMarginPercentage()  : 0
    }));

    res.json({
      supplier: { id: supplier.id, name: supplier.name },
      products: productsWithMetrics,
      total_products: productsWithMetrics.length,
      total_stock_value: productsWithMetrics.reduce((sum, p) => sum + p.stock_value, 0),
      low_stock_count: productsWithMetrics.filter(p => p.is_low_stock).length
    });
  } catch (error) {
    console.error('Get supplier products error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des produits', message: error.message });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!supplier) return res.status(404).json({ error: 'Fournisseur non trouvé' });

    const productCount = await Product.count({ where: { supplier_id: supplier.id, is_active: true } });
    if (productCount > 0) {
      return res.status(400).json({ error: `Impossible de supprimer: ${productCount} produit(s) associé(s)` });
    }

    await supplier.update({ is_active: false });

    try {
      await AuditLog.create({
        user_id: req.user.id, action: 'DELETE', resource_type: 'suppliers',
        resource_id: supplier.id, old_values: supplier.toJSON(),
        ip_address: req.ip, description: `Fournisseur désactivé: ${supplier.name}`
      });
    } catch(e) {}

    res.json({ message: 'Fournisseur désactivé avec succès' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression', message: error.message });
  }
});

module.exports = router;
