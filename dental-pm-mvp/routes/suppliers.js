const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult, param, query } = require('express-validator');
const { Supplier, Product, AuditLog } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// ✅ Helpers
const getClinicId = (req) => {
  const fromReq = req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
  if (fromReq) return fromReq;
  try { const t = req.headers['authorization']?.split(' ')[1]; return t ? jwt.verify(t, process.env.JWT_SECRET).clinic_id : null; } catch(e) { return null; }
};
const getUserId = (req) => {
  const fromUser = req.user?.id || req.user?.dataValues?.id || req.user?.userId || null;
  if (fromUser) return fromUser;
  try { const t = req.headers['authorization']?.split(' ')[1]; return t ? (jwt.verify(t, process.env.JWT_SECRET).userId || null) : null; } catch(e) { return null; }
};

const clinicWhere = (req, extra = {}) => {
  if (req.user?.role === 'SUPER_ADMIN') return extra;
  const clinicId = getClinicId(req);
  if (clinicId) return { clinic_id: clinicId, ...extra };
  return extra;
};

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page=1, limit=50, search, type, city, active='true' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const clinicId = getClinicId(req);

    // Auto-seed si disponible
    if (clinicId && typeof Supplier.seedForClinic === 'function') {
      try { await Supplier.seedForClinic(clinicId); } catch(e) {}
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
      where, limit: parseInt(limit), offset, order: [['name','ASC']]
    });

    const result = suppliers.map(s => ({
      ...s.toJSON(),
      performance_score: typeof s.getPerformanceScore === 'function' ? s.getPerformanceScore() : 0
    }));

    res.json({ suppliers: result, pagination: { current_page: parseInt(page), total_pages: Math.ceil(count/parseInt(limit)), total_count: count, per_page: parseInt(limit) } });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error:'Erreur récupération fournisseurs', message: error.message });
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      where: { id: req.params.id, ...clinicWhere(req) },
      include: [{ model: Product, as: 'products', where: { is_active: true }, required: false }]
    });
    if (!supplier) return res.status(404).json({ error:'Fournisseur non trouvé' });

    res.json({
      ...supplier.toJSON(),
      performance_score: typeof supplier.getPerformanceScore === 'function' ? supplier.getPerformanceScore() : 0,
      products_count: supplier.products?.length || 0,
      total_stock_value: supplier.products?.reduce((sum, p) => sum + (p.current_qty * p.unit_cost_mga), 0) || 0
    });
  } catch (error) {
    res.status(500).json({ error:'Erreur récupération fournisseur', message: error.message });
  }
});

// ── POST / ────────────────────────────────────────────────────────────────────
router.post('/', [
  body('name').isLength({ min:1, max:100 }).trim(),
  body('type').optional().isIn(['DENTAL','PHARMA','EQUIPMENT','GENERAL']),
  body('phone').optional().isString(),
  body('email').optional().isEmail().normalizeEmail(),
  body('city').optional().isString(),
  body('address').optional().isString(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const existing = await Supplier.findOne({ where: { name: req.body.name, ...clinicWhere(req) } });
    if (existing) return res.status(409).json({ error:'Un fournisseur avec ce nom existe déjà' });

    const supplier = await Supplier.create({ ...req.body, clinic_id: getClinicId(req) || null, is_active: true });
    try { await AuditLog.create({ user_id: getUserId(req), action:'CREATE', resource_type:'suppliers', resource_id: supplier.id, new_values: req.body, ip_address: req.ip, description:`Fournisseur créé: ${supplier.name}` }); } catch(e) {}

    res.status(201).json({ message:'Fournisseur créé avec succès', supplier });
  } catch (error) {
    res.status(500).json({ error:'Erreur création fournisseur', message: error.message });
  }
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────
router.put('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!supplier) return res.status(404).json({ error:'Fournisseur non trouvé' });

    const old = supplier.toJSON();
    await supplier.update(req.body);
    try { await AuditLog.create({ user_id: getUserId(req), action:'UPDATE', resource_type:'suppliers', resource_id: supplier.id, old_values: old, new_values: req.body, ip_address: req.ip, description:`Fournisseur mis à jour: ${supplier.name}` }); } catch(e) {}

    res.json({ message:'Fournisseur mis à jour', supplier });
  } catch (error) {
    res.status(500).json({ error:'Erreur mise à jour fournisseur', message: error.message });
  }
});

// ── PATCH /:id/disable ────────────────────────────────────────────────────────
router.patch('/:id/disable', [param('id').isUUID()], async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!supplier) return res.status(404).json({ error:'Fournisseur non trouvé' });
    await supplier.update({ is_active: false });
    res.json({ message:'Fournisseur désactivé', supplier: { ...supplier.toJSON(), is_active: false } });
  } catch (error) {
    res.status(500).json({ error:'Erreur désactivation', message: error.message });
  }
});

// ── GET /:id/products ─────────────────────────────────────────────────────────
router.get('/:id/products', [param('id').isUUID()], async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!supplier) return res.status(404).json({ error:'Fournisseur non trouvé' });

    const products = await Product.findAll({ where: { supplier_id: req.params.id, is_active: true }, order: [['name','ASC']] });
    const result   = products.map(p => ({
      ...p.toJSON(),
      is_low_stock:  typeof p.isLowStock      === 'function' ? p.isLowStock()      : p.current_qty <= p.min_qty,
      stock_value:   typeof p.getStockValue   === 'function' ? p.getStockValue()   : (p.current_qty * p.unit_cost_mga),
      margin_percentage: typeof p.getMarginPercentage === 'function' ? p.getMarginPercentage() : 0
    }));

    res.json({ supplier: { id: supplier.id, name: supplier.name }, products: result, total_products: result.length, total_stock_value: result.reduce((sum, p) => sum + p.stock_value, 0), low_stock_count: result.filter(p => p.is_low_stock).length });
  } catch (error) {
    res.status(500).json({ error:'Erreur récupération produits fournisseur', message: error.message });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!supplier) return res.status(404).json({ error:'Fournisseur non trouvé' });

    const count = await Product.count({ where: { supplier_id: supplier.id, is_active: true } });
    if (count > 0) return res.status(400).json({ error:`Impossible: ${count} produit(s) associé(s)` });

    await supplier.update({ is_active: false });
    try { await AuditLog.create({ user_id: getUserId(req), action:'DELETE', resource_type:'suppliers', resource_id: supplier.id, ip_address: req.ip, description:`Fournisseur désactivé: ${supplier.name}` }); } catch(e) {}

    res.json({ message:'Fournisseur désactivé avec succès' });
  } catch (error) {
    res.status(500).json({ error:'Erreur suppression fournisseur', message: error.message });
  }
});

module.exports = router;
