const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult, param, query } = require('express-validator');
const { Op } = require('sequelize');
const { requirePermission } = require('../utils/permissions');

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

const EXPENSE_COLUMNS = ['expense_type', 'expense_category', 'expense_label', 'expense_date'];
let purchaseSchemaCache = null;

const getPurchaseSchemaState = async (models, Purchase) => {
  const now = Date.now();
  if (purchaseSchemaCache && now - purchaseSchemaCache.checkedAt < 30000) return purchaseSchemaCache;

  try {
    const schema = await models.sequelize.getQueryInterface().describeTable('purchase_orders');
    const attributes = Object.keys(Purchase.rawAttributes || {}).filter(attr => schema[attr]);
    purchaseSchemaCache = {
      checkedAt: now,
      attributes: attributes.length ? attributes : undefined,
      expenseReady: EXPENSE_COLUMNS.every(column => Boolean(schema[column])),
    };
  } catch (error) {
    purchaseSchemaCache = { checkedAt: now, attributes: undefined, expenseReady: true };
  }

  return purchaseSchemaCache;
};

const ensureGeneralExpenseSchema = async (models) => {
  await models.sequelize.query(
    'ALTER TABLE "purchase_orders" ALTER COLUMN "supplier_id" DROP NOT NULL;'
  );
  purchaseSchemaCache = null;
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const fmtMga = value => new Intl.NumberFormat('fr-MG', { maximumFractionDigits: 0 }).format(value || 0) + ' Ar';
const fmtDate = value => value ? new Date(value).toLocaleDateString('fr-FR') : '—';

const purchaseIncludes = (models) => {
  const include = [];
  if (models.Supplier) {
    include.push({ model: models.Supplier, as: 'supplier', attributes: ['id', 'name', 'type'], required: false });
  }
  return include;
};

// ── GET /api/purchases ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const models   = await getModels();
    const Purchase = models.Purchase || models.PurchaseOrder;
    if (!Purchase) return res.json({ purchases: [], count: 0 });
    const schemaState = await getPurchaseSchemaState(models, Purchase);

    const clinicId = getClinicId(req);
    const where    = clinicId ? { clinic_id: clinicId } : {};
    const { status, supplier_id } = req.query;
    if (status)      where.status      = status;
    if (supplier_id) where.supplier_id = supplier_id;

    const purchases = await Purchase.findAll({
      where,
      attributes: schemaState.attributes,
      include: purchaseIncludes(models),
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
  body('items').optional().isArray(),
  body('expense_type').optional().isIn(['PURCHASE', 'GENERAL_EXPENSE']),
  body('expense_category').optional().isString().trim().isLength({ max: 50 }),
  body('expense_label').optional().isString().trim().isLength({ max: 150 }),
  body('amount_mga').optional().isFloat({ min: 0 }),
  body('expense_date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const models   = await getModels();
    const Purchase = models.Purchase || models.PurchaseOrder;
    if (!Purchase) return res.status(500).json({ error:'Modèle Purchase non disponible' });
    const schemaState = await getPurchaseSchemaState(models, Purchase);

    const clinicId = getClinicId(req);
    const userId   = getUserId(req);
    const {
      supplier_id,
      items = [],
      notes,
      expected_delivery_date,
      expense_type = 'PURCHASE',
      expense_category,
      expense_label,
      amount_mga,
      expense_date
    } = req.body;
    const isGeneralExpense = expense_type === 'GENERAL_EXPENSE';

    const year  = new Date().getFullYear();
    // Utiliser timestamp pour garantir l'unicité
    const ts    = Date.now().toString().slice(-6);
    const order_number = `${isGeneralExpense ? 'DEP' : 'PO'}-${year}-${ts}`;

    const total_mga = isGeneralExpense
      ? parseFloat(amount_mga || 0)
      : (items || []).reduce((sum, i) => sum + ((i.quantity || i.qty || 0) * (i.unit_price_mga || 0)), 0);

    if (isGeneralExpense && (!expense_label || total_mga <= 0)) {
      return res.status(400).json({ error:'Libellé et montant requis pour une dépense générale' });
    }
    if (isGeneralExpense && !schemaState.expenseReady) {
      return res.status(503).json({
        error:'Base de données non migrée pour les dépenses générales. Relancez le déploiement ou exécutez npm run db:migrate.',
        code:'PURCHASE_EXPENSE_SCHEMA_MISSING'
      });
    }

    // Colonnes exactes de la table purchase_orders
    const purchaseData = {
      number:     order_number,   // colonne 'number' pas 'order_number'
      created_by: userId,         // colonne 'created_by' pas 'created_by_user_id'
      status:     isGeneralExpense ? 'RECEIVED' : 'DRAFT',
    };
    if (schemaState.expenseReady) purchaseData.expense_type = expense_type;
    if (clinicId)               purchaseData.clinic_id              = clinicId;
    if (supplier_id)            purchaseData.supplier_id            = supplier_id;
    if (total_mga)              purchaseData.total_mga              = total_mga;
    if (notes)                  purchaseData.notes                  = notes;
    if (expected_delivery_date) purchaseData.expected_delivery_date = expected_delivery_date;
    if (expense_category)       purchaseData.expense_category       = expense_category;
    if (expense_label)          purchaseData.expense_label          = expense_label;
    if (expense_date)           purchaseData.expense_date           = expense_date;
    if (isGeneralExpense)       purchaseData.received_at            = new Date();

    // Essayer aussi order_number au cas où
    let purchase;
    try {
      purchase = await Purchase.create(purchaseData);
    } catch(e1) {
      if (isGeneralExpense && e1.original?.code === '23502' && e1.original?.column === 'supplier_id') {
        await ensureGeneralExpenseSchema(models);
        purchase = await Purchase.create(purchaseData);
      } else if (e1.message?.includes('number')) {
        // Essayer avec order_number
        delete purchaseData.number;
        purchaseData.order_number = order_number;
        purchase = await Purchase.create(purchaseData);
      } else throw e1;
    }

    // Créer les items si PurchaseItem existe
    if (!isGeneralExpense && items?.length > 0 && models.PurchaseOrderItem) {
      try {
        await Promise.all(items.map(item => models.PurchaseOrderItem.create({
          purchase_order_id: purchase.id,
          product_id:     item.product_id || null,
          qty:            item.quantity || item.qty || 1,
          unit_price_mga: item.unit_price_mga || 0,
        })));
      } catch(e) { console.warn('PurchaseItem create (non-fatal):', e.message); }
    }

    res.status(201).json({ message: isGeneralExpense ? 'Dépense créée' : 'Commande créée', purchase });
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
    const schemaState = await getPurchaseSchemaState(models, Purchase);

    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) };
    const purchase = await Purchase.findOne({ where, attributes: schemaState.attributes, include: purchaseIncludes(models) });
    if (!purchase) return res.status(404).json({ error:'Commande non trouvée' });

    res.json({ purchase });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── GET /api/purchases/:id/print ──────────────────────────────────────────────
router.get('/:id/print', [param('id').isUUID()], async (req, res) => {
  try {
    const models   = await getModels();
    const Purchase = models.Purchase || models.PurchaseOrder;
    if (!Purchase) return res.status(404).send('Modèle non disponible');

    const schemaState = await getPurchaseSchemaState(models, Purchase);
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) };
    const purchase = await Purchase.findOne({ where, attributes: schemaState.attributes, include: purchaseIncludes(models) });
    if (!purchase) return res.status(404).send('Dépense non trouvée');

    const data = purchase.toJSON ? purchase.toJSON() : purchase;
    const isExpense = data.expense_type === 'GENERAL_EXPENSE';
    const title = isExpense ? 'Dépense cabinet' : 'Bon de commande';
    const label = isExpense ? (data.expense_label || data.number) : data.number;
    const category = isExpense ? (data.expense_category || 'Dépense générale') : (data.supplier?.name || 'Fournisseur non renseigné');
    const date = data.expense_date || data.created_at;

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${escapeHtml(title)} ${escapeHtml(data.number)}</title>
<style>
*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#0f172a;margin:0;padding:28px;background:#fff;font-size:13px}.sheet{max-width:760px;margin:0 auto}.header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #0D7A87;padding-bottom:18px;margin-bottom:24px}.brand{font-size:22px;font-weight:800;color:#0D7A87}.doc-title{text-align:right}.doc-title h1{margin:0;font-size:24px}.doc-title div{color:#64748b;margin-top:4px}.box{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px}.label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:700;margin-bottom:5px}.value{font-size:15px;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.amount{background:#fef2f2;border-color:#fecaca}.amount .value{font-size:24px;color:#dc2626}.notes{white-space:pre-wrap;line-height:1.6}.footer{border-top:1px solid #e2e8f0;margin-top:28px;padding-top:12px;text-align:center;color:#64748b;font-size:11px}@media print{body{padding:0}.sheet{max-width:none}}
</style></head><body><div class="sheet">
<div class="header"><div><div class="brand">DentalPM</div><div>Gestion cabinet dentaire</div></div><div class="doc-title"><h1>${escapeHtml(title)}</h1><div>${escapeHtml(data.number)}</div></div></div>
<div class="grid">
  <div class="box"><div class="label">${isExpense ? 'Libellé' : 'Bon'}</div><div class="value">${escapeHtml(label)}</div></div>
  <div class="box"><div class="label">${isExpense ? 'Catégorie' : 'Fournisseur'}</div><div class="value">${escapeHtml(category)}</div></div>
  <div class="box"><div class="label">Date</div><div class="value">${escapeHtml(fmtDate(date))}</div></div>
  <div class="box"><div class="label">Statut</div><div class="value">${escapeHtml(data.status || '—')}</div></div>
</div>
<div class="box amount"><div class="label">Montant</div><div class="value">${escapeHtml(fmtMga(parseFloat(data.total_mga || 0)))}</div></div>
${data.notes ? `<div class="box"><div class="label">Notes</div><div class="notes">${escapeHtml(data.notes)}</div></div>` : ''}
<div class="footer">Document généré depuis DentalPM le ${escapeHtml(fmtDate(new Date()))}</div>
</div><script>window.print();</script></body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Print purchase error:', error);
    res.status(500).send('Erreur impression');
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
router.post('/:id/receive', requirePermission('purchases', 'execute'), [param('id').isUUID()], async (req, res) => {
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
    if (models.PurchaseOrderItem && models.Product) {
      try {
        const items = await models.PurchaseOrderItem.findAll({ where: { purchase_order_id: purchase.id } });
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
