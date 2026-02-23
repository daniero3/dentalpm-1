const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { PurchaseOrder, PurchaseOrderItem, Product, Supplier, StockMovement, User, AuditLog, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');
const { auditLogger } = require('../middleware/auditLogger');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authenticateToken);
router.use(requireValidSubscription);
router.use(auditLogger('purchases'));

// GET all purchase orders
router.get('/', requireClinicId, [
  query('status').optional().isIn(['DRAFT', 'RECEIVED', 'CANCELLED']),
  query('supplier_id').optional().isUUID(),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { status, supplier_id, limit = 50 } = req.query;
    
    const whereClause = { clinic_id: req.clinic_id };
    if (status) whereClause.status = status;
    if (supplier_id) whereClause.supplier_id = supplier_id;

    const orders = await PurchaseOrder.findAll({
      where: whereClause,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'type'] },
        { model: User, as: 'createdBy', attributes: ['id', 'full_name'] },
        { model: PurchaseOrderItem, as: 'items', include: [
          { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }
        ]}
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({ 
      purchases: orders.map(o => ({
        ...o.toJSON(),
        items_count: o.items?.length || 0
      }))
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET single purchase order
router.get('/:id', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id },
      include: [
        { model: Supplier, as: 'supplier' },
        { model: User, as: 'createdBy', attributes: ['id', 'full_name'] },
        { model: User, as: 'receivedBy', attributes: ['id', 'full_name'] },
        { model: PurchaseOrderItem, as: 'items', include: [
          { model: Product, as: 'product' }
        ]}
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET print view (HTML simple)
router.get('/:id/print', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id },
      include: [
        { model: Supplier, as: 'supplier' },
        { model: User, as: 'createdBy', attributes: ['id', 'full_name'] },
        { model: PurchaseOrderItem, as: 'items', include: [
          { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'unit'] }
        ]}
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }

    const formatMoney = (val) => new Intl.NumberFormat('fr-MG').format(val || 0);
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bon de Commande ${order.number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .info { display: flex; justify-content: space-between; margin: 20px 0; }
    .info-block { flex: 1; }
    .info-block h3 { margin: 0 0 10px 0; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f5f5f5; }
    .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
    .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
    .status.DRAFT { background: #fef3c7; color: #92400e; }
    .status.RECEIVED { background: #d1fae5; color: #065f46; }
    .status.CANCELLED { background: #fee2e2; color: #991b1b; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>BON DE COMMANDE</h1>
  <div class="info">
    <div class="info-block">
      <h3>Numéro</h3>
      <p><strong>${order.number}</strong></p>
      <p>Date: ${formatDate(order.created_at)}</p>
      <p>Statut: <span class="status ${order.status}">${order.status}</span></p>
    </div>
    <div class="info-block">
      <h3>Fournisseur</h3>
      <p><strong>${order.supplier?.name || '-'}</strong></p>
      <p>${order.supplier?.phone || ''}</p>
      <p>${order.supplier?.email || ''}</p>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Produit</th>
        <th>SKU</th>
        <th>Qté</th>
        <th>Prix Unit.</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${order.items?.map(item => `
        <tr>
          <td>${item.product?.name || '-'}</td>
          <td>${item.product?.sku || '-'}</td>
          <td>${item.qty}</td>
          <td>${formatMoney(item.unit_price_mga)} Ar</td>
          <td>${formatMoney(item.line_total)} Ar</td>
        </tr>
      `).join('') || '<tr><td colspan="5">Aucun article</td></tr>'}
    </tbody>
  </table>
  
  <div class="total">
    TOTAL: ${formatMoney(order.total_mga)} Ar
  </div>
  
  <p style="margin-top: 40px; color: #666;">
    Créé par: ${order.createdBy?.full_name || '-'}<br>
    ${order.received_at ? `Reçu le: ${formatDate(order.received_at)}` : ''}
  </p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Print purchase error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST create new purchase order (DRAFT)
router.post('/', requireClinicId, [
  body('supplier_id').isUUID().withMessage('Fournisseur requis'),
  body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
  body('items.*.product_id').isUUID(),
  body('items.*.qty').isInt({ min: 1 }),
  body('items.*.unit_price_mga').isFloat({ min: 0 }),
  body('notes').optional().isString()
], async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await t.rollback();
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { supplier_id, items, notes } = req.body;

    // Verify supplier belongs to clinic
    const supplier = await Supplier.findOne({
      where: { id: supplier_id, clinic_id: req.clinic_id, is_active: true }
    });
    if (!supplier) {
      await t.rollback();
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    // Generate PO number
    const number = await PurchaseOrder.generateNumber(req.clinic_id);

    // Calculate total
    let total_mga = 0;
    for (const item of items) {
      total_mga += item.qty * item.unit_price_mga;
    }

    // Create purchase order
    const order = await PurchaseOrder.create({
      clinic_id: req.clinic_id,
      supplier_id,
      number,
      status: 'DRAFT',
      total_mga,
      notes,
      created_by: req.user.id
    }, { transaction: t });

    // Create items
    for (const item of items) {
      await PurchaseOrderItem.create({
        purchase_order_id: order.id,
        product_id: item.product_id,
        qty: item.qty,
        unit_price_mga: item.unit_price_mga,
        line_total: item.qty * item.unit_price_mga
      }, { transaction: t });
    }

    await t.commit();

    // Fetch complete order
    const completeOrder = await PurchaseOrder.findByPk(order.id, {
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
        { model: PurchaseOrderItem, as: 'items', include: [
          { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }
        ]}
      ]
    });

    // Audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'purchase_order',
      resource_id: order.id,
      new_values: { number, supplier_id, items_count: items.length, total_mga },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Bon de commande créé: ${number}`
    });

    res.status(201).json({ 
      message: 'Bon de commande créé',
      purchase: completeOrder
    });
  } catch (error) {
    await t.rollback();
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// PUT update purchase order (DRAFT only)
router.put('/:id', requireClinicId, [
  param('id').isUUID(),
  body('items').optional().isArray(),
  body('notes').optional().isString()
], async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }

    if (order.status !== 'DRAFT') {
      await t.rollback();
      return res.status(400).json({ error: 'Seuls les bons en DRAFT peuvent être modifiés' });
    }

    const { items, notes } = req.body;

    if (items) {
      // Delete old items
      await PurchaseOrderItem.destroy({
        where: { purchase_order_id: order.id },
        transaction: t
      });

      // Calculate new total and create items
      let total_mga = 0;
      for (const item of items) {
        const line_total = item.qty * item.unit_price_mga;
        total_mga += line_total;
        await PurchaseOrderItem.create({
          purchase_order_id: order.id,
          product_id: item.product_id,
          qty: item.qty,
          unit_price_mga: item.unit_price_mga,
          line_total
        }, { transaction: t });
      }

      await order.update({ total_mga }, { transaction: t });
    }

    if (notes !== undefined) {
      await order.update({ notes }, { transaction: t });
    }

    await t.commit();

    const updatedOrder = await PurchaseOrder.findByPk(order.id, {
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseOrderItem, as: 'items', include: [
          { model: Product, as: 'product' }
        ]}
      ]
    });

    res.json({ message: 'Bon de commande mis à jour', purchase: updatedOrder });
  } catch (error) {
    await t.rollback();
    console.error('Update purchase error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST receive purchase order -> updates stock
router.post('/:id/receive', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id },
      include: [{ model: PurchaseOrderItem, as: 'items' }]
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }

    if (order.status !== 'DRAFT') {
      await t.rollback();
      return res.status(400).json({ error: `Impossible de réceptionner: statut actuel = ${order.status}` });
    }

    // Process each item: create stock movement + update product qty
    const stockMovements = [];
    for (const item of order.items) {
      // Get current product quantity
      const product = await Product.findByPk(item.product_id, { transaction: t });
      const previousQty = product ? parseInt(product.current_qty || 0) : 0;
      const newQty = previousQty + item.qty;

      // Create IN stock movement
      const movement = await StockMovement.create({
        product_id: item.product_id,
        type: 'IN',
        quantity: item.qty,
        unit_cost_mga: item.unit_price_mga,
        reason: `Réception commande ${order.number}`,
        reference: order.number,
        user_id: req.user.id,
        previous_qty: previousQty,
        new_qty: newQty,
        clinic_id: req.clinic_id
      }, { transaction: t });
      stockMovements.push(movement);

      // Update product current_qty
      await Product.update(
        { current_qty: newQty },
        { where: { id: item.product_id }, transaction: t }
      );
    }

    // Update order status
    await order.update({
      status: 'RECEIVED',
      received_at: new Date(),
      received_by: req.user.id
    }, { transaction: t });

    await t.commit();

    // Audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      resource_type: 'purchase_order',
      resource_id: order.id,
      old_values: { status: 'DRAFT' },
      new_values: { status: 'RECEIVED', items_received: order.items.length },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Bon ${order.number} réceptionné: ${order.items.length} articles, stock mis à jour`
    });

    res.json({
      message: 'Commande réceptionnée, stock mis à jour',
      purchase: {
        ...order.toJSON(),
        status: 'RECEIVED',
        received_at: new Date()
      },
      stock_movements_created: stockMovements.length
    });
  } catch (error) {
    await t.rollback();
    console.error('Receive purchase error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// POST cancel purchase order
router.post('/:id/cancel', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Bon de commande non trouvé' });
    }

    if (order.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Seuls les bons en DRAFT peuvent être annulés' });
    }

    await order.update({ status: 'CANCELLED' });

    res.json({ message: 'Bon de commande annulé', purchase: order });
  } catch (error) {
    console.error('Cancel purchase error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
