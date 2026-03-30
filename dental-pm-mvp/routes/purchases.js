const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult, param, query } = require('express-validator');
const { Op } = require('sequelize');

const router = express.Router();

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
    // Utiliser timestamp pour garantir l'unicité
    const ts    = Date.now().toString().slice(-6);
    const order_number = `PO-${year}-${ts}`;

    const total_mga = (items || []).reduce((sum, i) => sum + ((i.quantity || 0) * (i.unit_price_mga || 0)), 0);

    // Colonnes exactes de la table purchase_orders
    const purchaseData = {
      number:     order_number,   // colonne 'number' pas 'order_number'
      created_by: userId,         // colonne 'created_by' pas 'created_by_user_id'
      status:     'DRAFT',
    };
    if (clinicId)               purchaseData.clinic_id              = clinicId;
    if (supplier_id)            purchaseData.supplier_id            = supplier_id;
    if (total_mga)              purchaseData.total_mga              = total_mga;
    if (notes)                  purchaseData.notes                  = notes;
    if (expected_delivery_date) purchaseData.expected_delivery_date = expected_delivery_date;

    // Essayer aussi order_number au cas où
    let purchase;
    try {
      purchase = await Purchase.create(purchaseData);
    } catch(e1) {
      if (e1.message?.includes('number')) {
        // Essayer avec order_number
        delete purchaseData.number;
        purchaseData.order_number = order_number;
        purchase = await Purchase.create(purchaseData);
      } else throw e1;
    }

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


// ── POST /:id/receive ─────────────────────────────────────────────────────────
router.post('/:id/receive', [param('id').isUUID()], async (req, res) => {
  try {
    const models   = await getModels();
    const Purchase = models.Purchase || models.PurchaseOrder;
    if (!Purchase) return res.status(500).json({ error: 'Modèle non disponible' });

    const clinicId = getClinicId(req);
    const where    = { id: req.params.id };
    if (clinicId) where.clinic_id = clinicId;

    const purchase = await Purchase.findOne({ where });
    if (!purchase) return res.status(404).json({ error: 'Commande non trouvée' });

    await purchase.update({ status: 'RECEIVED', received_at: new Date() });

    // Mettre à jour le stock des produits si items disponibles
    if (models.PurchaseItem && models.Product) {
      try {
        const items = await models.PurchaseItem.findAll({ where: { purchase_id: purchase.id } });
        for (const item of items) {
          if (item.product_id) {
            const product = await models.Product.findByPk(item.product_id);
            if (product) {
              await product.update({ current_qty: (product.current_qty || 0) + (item.quantity || 0) });
            }
          }
        }
      } catch(e) { console.warn('Stock update (non-fatal):', e.message); }
    }

    res.json({ message: 'Commande reçue', purchase });
  } catch (error) {
    console.error('Receive purchase error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;
