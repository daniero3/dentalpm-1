const express = require('express');
const { param, body, query, validationResult } = require('express-validator');
const { LabOrder, Patient, User, AuditLog } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// ✅ Helpers
const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
const getUserId   = (req) => req.user?.id   || req.user?.dataValues?.id || req.user?.userId || null;

const WORK_TYPES = ['CROWN','BRIDGE','PARTIAL_DENTURE','COMPLETE_DENTURE','IMPLANT_CROWN','ORTHODONTIC_APPLIANCE','NIGHT_GUARD','VENEER','INLAY_ONLAY','OTHER'];
const STATUSES   = ['CREATED','SENT','IN_PROGRESS','DELIVERED','CANCELLED'];

// ── GET /api/labs/orders ──────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where = {};
    if (clinicId) where.clinic_id = clinicId;

    const orders = await LabOrder.findAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id','first_name','last_name','phone_primary'], required: false },
        { model: User,    as: 'dentist', attributes: ['id','full_name'], required: false }
      ],
      order: [['createdAt','DESC']],
      limit: 100
    });

    return res.json({ orders, count: orders.length });
  } catch (error) {
    console.error('List lab orders error:', error);
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── POST /api/labs/orders ─────────────────────────────────────────────────────
router.post('/orders', [
  body('patient_id').isUUID(),
  body('work_type').isIn(WORK_TYPES),
  body('due_date').isDate(),
  body('lab_name').optional().isString(),
  body('shade').optional().isString(),
  body('lab_cost_mga').optional().isFloat({ min:0 }),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const userId   = getUserId(req);
    const { patient_id, work_type, due_date, lab_name, shade, lab_cost_mga, notes } = req.body;

    const year    = new Date().getFullYear();
    const count   = await LabOrder.count({ where: { ...(clinicId ? { clinic_id: clinicId } : {}) } });
    const orderNumber = `LAB-${year}-${String(count + 1).padStart(4, '0')}`;

    const order = await LabOrder.create({
      order_number: orderNumber,
      patient_id,
      clinic_id:    clinicId,
      dentist_id:   userId,
      work_type,
      due_date,
      lab_name:     lab_name || null,
      shade:        shade    || null,
      lab_cost_mga: parseFloat(lab_cost_mga) || 0,
      notes:        notes    || null,
      status:       'CREATED'
    });

    try {
      await AuditLog.create({ user_id: userId, action:'CREATE', resource_type:'lab_orders', resource_id: order.id, ip_address: req.ip, description:`Commande labo créée: ${orderNumber}` });
    } catch (e) { console.warn('AuditLog (non-fatal):', e.message); }

    const complete = await LabOrder.findByPk(order.id, {
      include: [{ model: Patient, as: 'patient', attributes: ['id','first_name','last_name'], required: false }]
    });

    return res.status(201).json({ message:'Commande créée', order: complete });
  } catch (error) {
    console.error('Create lab order error:', error);
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── POST /api/labs/orders/:id/status ─────────────────────────────────────────
router.post('/orders/:id/status', [
  param('id').isUUID(),
  body('status').isIn(STATUSES)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const where    = { id: req.params.id };
    if (clinicId) where.clinic_id = clinicId;

    const order = await LabOrder.findOne({ where });
    if (!order) return res.status(404).json({ error:'Commande non trouvée' });

    await order.update({ status: req.body.status });
    return res.json({ message:'Statut mis à jour', order });
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── GET /api/labs/orders/:id/print ────────────────────────────────────────────
router.get('/orders/:id/print', [param('id').isUUID()], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id };
    if (clinicId) where.clinic_id = clinicId;

    const order = await LabOrder.findOne({
      where,
      include: [{ model: Patient, as: 'patient', required: false }]
    });
    if (!order) return res.status(404).json({ error:'Commande non trouvée' });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Commande ${order.order_number}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#0D7A87}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #eee}</style>
    </head><body>
    <h1>Commande Laboratoire</h1>
    <p><strong>N°:</strong> ${order.order_number}</p>
    <p><strong>Patient:</strong> ${order.patient?.first_name || ''} ${order.patient?.last_name || ''}</p>
    <p><strong>Type:</strong> ${order.work_type}</p>
    <p><strong>Laboratoire:</strong> ${order.lab_name || 'N/A'}</p>
    <p><strong>Teinte:</strong> ${order.shade || 'N/A'}</p>
    <p><strong>Date limite:</strong> ${order.due_date || 'N/A'}</p>
    <p><strong>Coût:</strong> ${(order.lab_cost_mga||0).toLocaleString()} MGA</p>
    <p><strong>Statut:</strong> ${order.status}</p>
    ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
    <script>window.print();</script>
    </body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

module.exports = router;
