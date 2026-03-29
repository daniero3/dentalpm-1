const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Op } = require('sequelize');

const router = express.Router();

const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
const getUserId   = (req) => req.user?.id   || req.user?.dataValues?.id || null;

async function getModels() { return require('../models'); }

// ── GET /api/purchases ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const models   = await getModels();
    const Purchase = models.Purchase || models.PurchaseOrder;
    if (!Purchase) return res.json({ purchases: [], count: 0 });

    const clinicId = getClinicId(req);
    const where    = clinicId ? { clinic_id: clinicId } : {};
    const { status, supplier_id } = req.query;
    if (status)      where.status      = status;
    if (supplier_id) where.supplier_id = supplier_id;

    const purchases = await Purchase.findAll({
      where,
      order: [['created_at','DESC']],
      limit: 100
    });

    res.json({ purchases, count: purchases.length });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── POST /api/purchases ───────────────────────────────────────────────────────
router.post('/', [
  body('supplier_id').optional().isUUID(),
  body('items').optional().isArray()
], async (req, res) => {
  try {
    const models   = await getModels();
    const Purchase = models.Purchase || models.PurchaseOrder;
    if (!Purchase) return res.status(500).json({ error:'Modèle Purchase non disponible' });

    const clinicId = getClinicId(req);
    const userId   = getUserId(req);
    const { supplier_id, items, notes, expected_delivery_date } = req.body;

    const year  = new Date().getFullYear();
    const count = await Purchase.count({ where: clinicId ? { clinic_id: clinicId } : {} });
    const order_number = `PO-${year}-${String(count+1).padStart(4,'0')}`;

    const total_mga = (items || []).reduce((sum, i) => sum + ((i.quantity || 0) * (i.unit_price_mga || 0)), 0);

    const purchase = await Purchase.create({
      order_number,
      supplier_id:            supplier_id || null,
      clinic_id:              clinicId,
      created_by_user_id:     userId,
      status:                 'DRAFT',
      total_mga,
      notes:                  notes || null,
      expected_delivery_date: expected_delivery_date || null
    });

    // Créer les items si PurchaseItem existe
    if (items?.length > 0 && models.PurchaseItem) {
      try {
        await Promise.all(items.map(item => models.PurchaseItem.create({
          purchase_id:    purchase.id,
          product_id:     item.product_id || null,
          description:    item.description || item.name || 'Article',
          quantity:       item.quantity || 1,
          unit_price_mga: item.unit_price_mga || 0,
          total_mga:      (item.quantity || 1) * (item.unit_price_mga || 0)
        })));
      } catch(e) { console.warn('PurchaseItem create (non-fatal):', e.message); }
    }

    res.status(201).json({ message:'Commande créée', purchase });
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── GET /api/purchases/:id ────────────────────────────────────────────────────
router.get('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const models   = await getModels();
    const Purchase = models.Purchase || models.PurchaseOrder;
    if (!Purchase) return res.status(404).json({ error:'Modèle non disponible' });

    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) };
    const purchase = await Purchase.findOne({ where });
    if (!purchase) return res.status(404).json({ error:'Commande non trouvée' });

    res.json({ purchase });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── PATCH /api/purchases/:id/status ──────────────────────────────────────────
router.patch('/:id/status', [
  param('id').isUUID(),
  body('status').isIn(['DRAFT','SENT','RECEIVED','CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const models   = await getModels();
    const Purchase = models.Purchase || models.PurchaseOrder;
    if (!Purchase) return res.status(500).json({ error:'Modèle non disponible' });

    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) };
    const purchase = await Purchase.findOne({ where });
    if (!purchase) return res.status(404).json({ error:'Commande non trouvée' });

    await purchase.update({ status: req.body.status });
    res.json({ message:'Statut mis à jour', purchase });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

module.exports = router;
