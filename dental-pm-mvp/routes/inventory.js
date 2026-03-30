const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Product, StockMovement, Supplier, User, AuditLog, sequelize } = require('../models');
const { requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

const router = express.Router();

// ✅ Helpers — pas de requireValidSubscription ni requireClinicId externe
const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
const getUserId   = (req) => {
  const fromUser = req.user?.id || req.user?.dataValues?.id || req.user?.userId || null;
  if (fromUser) return fromUser;
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.userId || decoded.id || null;
    }
  } catch(e) {}
  return null;
};

// ── GET /products ─────────────────────────────────────────────────────────────
router.get('/products', [
  query('page').optional().isInt({ min:1 }),
  query('limit').optional().isInt({ min:1, max:100 }),
  query('category').optional().isIn(['INSTRUMENTS','CONSUMABLES','MATERIALS','EQUIPMENT','PROSTHETICS','ORTHODONTICS','HYGIENE','ANESTHESIA','RADIOLOGY','OTHER']),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const { page=1, limit=20, category, low_stock, search, supplier_id } = req.query;
    const offset    = (page - 1) * limit;
    const clinicId  = getClinicId(req);

    const where = { is_active: true };
    if (clinicId)    where.clinic_id   = clinicId;
    if (category)    where.category    = category;
    if (supplier_id) where.supplier_id = supplier_id;
    if (search) {
      where[Op.or] = [
        { name:        { [Op.iLike]: `%${search}%` } },
        { sku:         { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [{ model: Supplier, as: 'supplier', attributes: ['id','name','phone','email'], required: false }],
      limit: parseInt(limit), offset: parseInt(offset),
      order: [['name','ASC']]
    });

    const productsWithMetrics = products.map(p => ({
      ...p.toJSON(),
      is_low_stock:      typeof p.isLowStock         === 'function' ? p.isLowStock()         : p.current_qty <= p.min_qty,
      margin_percentage: typeof p.getMarginPercentage === 'function' ? p.getMarginPercentage() : 0,
      stock_value:       typeof p.getStockValue       === 'function' ? p.getStockValue()       : (p.current_qty * p.unit_cost_mga)
    }));

    res.json({ products: productsWithMetrics, pagination: { current_page: parseInt(page), total_pages: Math.ceil(count/limit), total_count: count, per_page: parseInt(limit) } });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error:'Erreur lors de la récupération des produits', details: error.message });
  }
});

// ── GET /products/:id ─────────────────────────────────────────────────────────
router.get('/products/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Supplier,      as: 'supplier',  required: false },
        { model: StockMovement, as: 'movements', limit: 20, order: [['created_at','DESC']], required: false }
      ]
    });
    if (!product) return res.status(404).json({ error:'Produit non trouvé' });

    try { await AuditLog.create({ user_id: getUserId(req), action:'VIEW', resource_type:'products', resource_id: product.id, ip_address: req.ip, description:`Consultation produit: ${product.name}` }); } catch(e) {}

    res.json({
      ...product.toJSON(),
      is_low_stock:      typeof product.isLowStock         === 'function' ? product.isLowStock()         : product.current_qty <= product.min_qty,
      margin_percentage: typeof product.getMarginPercentage === 'function' ? product.getMarginPercentage() : 0,
      stock_value:       typeof product.getStockValue       === 'function' ? product.getStockValue()       : (product.current_qty * product.unit_cost_mga)
    });
  } catch (error) {
    res.status(500).json({ error:'Erreur lors de la récupération du produit', details: error.message });
  }
});

// ── POST /products ────────────────────────────────────────────────────────────
router.post('/products', [
  body('name').isLength({ min:1, max:100 }).trim(),
  body('sku').isLength({ min:1, max:50 }).trim(),
  body('category').isIn(['INSTRUMENTS','CONSUMABLES','MATERIALS','EQUIPMENT','PROSTHETICS','ORTHODONTICS','HYGIENE','ANESTHESIA','RADIOLOGY','OTHER']),
  body('unit_cost_mga').isFloat({ min:0 }),
  body('sale_price_mga').isFloat({ min:0 }),
  body('min_qty').isInt({ min:0 }),
  body('supplier_id').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const existing = await Product.findOne({ where: { sku: req.body.sku } });
    if (existing) return res.status(409).json({ error:'Un produit avec ce SKU existe déjà' });

    const product = await Product.create({ ...req.body, clinic_id: clinicId });
    try { await AuditLog.create({ user_id: getUserId(req), action:'CREATE', resource_type:'products', resource_id: product.id, new_values: req.body, ip_address: req.ip, description:`Produit créé: ${product.name}` }); } catch(e) {}

    res.status(201).json({ message:'Produit créé avec succès', product });
  } catch (error) {
    res.status(500).json({ error:'Erreur lors de la création du produit', details: error.message });
  }
});

// ── PUT /products/:id ─────────────────────────────────────────────────────────
router.put('/products/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error:'Produit non trouvé' });

    const old = product.toJSON();
    await product.update(req.body);
    try { await AuditLog.create({ user_id: getUserId(req), action:'UPDATE', resource_type:'products', resource_id: product.id, old_values: old, new_values: req.body, ip_address: req.ip, description:`Produit mis à jour: ${product.name}` }); } catch(e) {}

    res.json({ message:'Produit mis à jour', product });
  } catch (error) {
    res.status(500).json({ error:'Erreur lors de la mise à jour du produit', details: error.message });
  }
});

// ── POST /products/:id/movements ──────────────────────────────────────────────
router.post('/products/:id/movements', [
  param('id').isUUID(),
  body('type').isIn(['IN','OUT','ADJUST']),
  body('quantity').isInt({ min:1 }),
  body('reason').isLength({ min:1, max:255 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const product  = await Product.findOne({ where: { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) } });
    if (!product) return res.status(404).json({ error:'Produit non trouvé' });

    const { type, quantity, reason, reference } = req.body;
    const currentQty = product.current_qty;
    let newQty;

    if (type === 'IN')     newQty = currentQty + Math.abs(quantity);
    else if (type === 'OUT') {
      newQty = currentQty - Math.abs(quantity);
      if (newQty < 0) return res.status(400).json({ error:'Stock insuffisant' });
    } else newQty = Math.abs(quantity);

    const movQty = type === 'ADJUST' ? (newQty - currentQty) : (type === 'IN' ? Math.abs(quantity) : -Math.abs(quantity));
    const userId = getUserId(req);
    const movData = { product_id: product.id, type, quantity: movQty, reason };
    if (clinicId)      movData.clinic_id    = clinicId;
    if (userId)        movData.user_id      = userId;
    if (reference)     movData.reference    = reference;
    try { movData.previous_qty = currentQty; movData.new_qty = newQty; } catch(e) {}

    let movement;
    try {
      movement = await StockMovement.create(movData);
    } catch(e) {
      // Si colonnes manquantes, essayer version minimale
      console.warn('StockMovement full create failed, trying minimal:', e.message);
      movement = await StockMovement.create({ product_id: product.id, type, quantity: movQty, reason });
    }

    // Mettre à jour le stock
    try { await product.update({ current_qty: newQty }); } catch(e) {
      console.warn('product.update current_qty failed:', e.message);
    }

    res.status(201).json({ message:'Mouvement enregistré', movement: { id: movement.id, type, quantity: movement.quantity, previous_qty: currentQty, new_qty: newQty }, product: { id: product.id, name: product.name, current_qty: newQty } });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── POST /movements ───────────────────────────────────────────────────────────
router.post('/movements', [
  body('product_id').isUUID(),
  body('type').isIn(['IN','OUT','ADJUST']),
  body('quantity').isInt(),
  body('reason').isLength({ min:1, max:255 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const { product_id, type, quantity, reason, unit_cost_mga, reference, batch_number, expiry_date, notes } = req.body;
    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ error:'Produit non trouvé' });

    const currentQty = product.current_qty;
    let newQty;
    if (type === 'IN')     newQty = currentQty + Math.abs(quantity);
    else if (type === 'OUT') newQty = Math.max(0, currentQty - Math.abs(quantity));
    else newQty = Math.abs(quantity);

    const movement = await StockMovement.create({
      product_id, type,
      quantity: type === 'ADJUST' ? (newQty - currentQty) : (type === 'IN' ? Math.abs(quantity) : -Math.abs(quantity)),
      unit_cost_mga, reason, reference, batch_number, expiry_date, notes,
      user_id: getUserId(req), previous_qty: currentQty, new_qty: newQty
    });

    await product.update({ current_qty: newQty });

    res.status(201).json({ message:'Mouvement enregistré', movement, product: { id: product.id, name: product.name, previous_qty: currentQty, new_qty: newQty } });
  } catch (error) {
    res.status(500).json({ error:'Erreur lors de l\'enregistrement du mouvement', details: error.message });
  }
});

// ── GET /movements ────────────────────────────────────────────────────────────
router.get('/movements', async (req, res) => {
  try {
    const { page=1, limit=20, product_id, type, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    const where  = {};
    if (product_id)  where.product_id  = product_id;
    if (type)        where.type        = type;
    if (start_date)  where.created_at  = { [Op.gte]: start_date };
    if (end_date)    where.created_at  = { ...(where.created_at||{}), [Op.lte]: end_date };

    const { count, rows: movements } = await StockMovement.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id','name','sku','unit'], required: false },
        { model: User,    as: 'user',    attributes: ['id','full_name'],          required: false }
      ],
      limit: parseInt(limit), offset: parseInt(offset),
      order: [['created_at','DESC']]
    });

    res.json({ movements, pagination: { current_page: parseInt(page), total_pages: Math.ceil(count/limit), total_count: count, per_page: parseInt(limit) } });
  } catch (error) {
    res.status(500).json({ error:'Erreur lors de la récupération des mouvements', details: error.message });
  }
});

// ── GET /alerts ───────────────────────────────────────────────────────────────
router.get('/alerts', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { is_active: true, ...(clinicId ? { clinic_id: clinicId } : {}) };

    const products = await Product.findAll({
      where,
      include: [{ model: Supplier, as: 'supplier', attributes: ['id','name','phone','email'], required: false }],
      order: [['current_qty','ASC'],['name','ASC']]
    });

    const alerts = products
      .filter(p => p.current_qty <= p.min_qty)
      .map(p => ({
        id: p.id, name: p.name, sku: p.sku, category: p.category,
        current_qty: p.current_qty, min_qty: p.min_qty,
        shortage: p.min_qty - p.current_qty,
        urgency_level: p.current_qty === 0 ? 'CRITICAL' : p.current_qty < (p.min_qty/2) ? 'HIGH' : 'MEDIUM',
        supplier: p.supplier
      }));

    res.json({ alerts, total_alerts: alerts.length, critical_alerts: alerts.filter(a => a.urgency_level === 'CRITICAL').length });
  } catch (error) {
    res.status(500).json({ error:'Erreur récupération alertes', details: error.message });
  }
});

// ── GET /low-stock ────────────────────────────────────────────────────────────
router.get('/low-stock', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { is_active: true, ...(clinicId ? { clinic_id: clinicId } : {}) };

    const products = await Product.findAll({
      where,
      include: [{ model: Supplier, as: 'supplier', attributes: ['id','name','phone','email'], required: false }],
      order: [['current_qty','ASC'],['name','ASC']]
    });

    const alerts = products
      .filter(p => p.current_qty < p.min_qty)
      .map(p => ({ ...p.toJSON(), shortage: p.min_qty - p.current_qty, urgency_level: p.current_qty === 0 ? 'CRITICAL' : p.current_qty < (p.min_qty/2) ? 'HIGH' : 'MEDIUM' }));

    res.json({ alerts, total_alerts: alerts.length, critical_alerts: alerts.filter(a => a.urgency_level === 'CRITICAL').length });
  } catch (error) {
    res.status(500).json({ error:'Erreur alertes stock', details: error.message });
  }
});

module.exports = router;
