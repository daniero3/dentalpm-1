const express = require('express');
const jwt = require('jsonwebtoken');
const { param, body, validationResult } = require('express-validator');

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

async function getModels() {
  return require('../models');
}

const WORK_TYPES = ['CROWN','BRIDGE','PARTIAL_DENTURE','COMPLETE_DENTURE','IMPLANT_CROWN','ORTHODONTIC_APPLIANCE','NIGHT_GUARD','VENEER','INLAY_ONLAY','OTHER'];
const STATUSES   = ['CREATED','SENT','IN_PROGRESS','DELIVERED','CANCELLED'];

// ── GET /api/labs/orders ──────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const models   = await getModels();
    const LabOrder = models.LabOrder;
    if (!LabOrder) return res.json({ orders: [], count: 0 });

    const clinicId = getClinicId(req);
    const where    = clinicId ? { clinic_id: clinicId } : {};

    let orders = [];
    try {
      const Patient = models.Patient;
      orders = await LabOrder.findAll({
        where,
        include: Patient ? [{ model: Patient, as: 'patient', attributes: ['id','first_name','last_name'], required: false }] : [],
        order: [['createdAt','DESC']],
        limit: 100
      });
    } catch (includeErr) {
      console.warn('Include error, retrying without:', includeErr.message);
      orders = await LabOrder.findAll({ where, order: [['createdAt','DESC']], limit: 100 });
    }

    return res.json({ orders, count: orders.length });
  } catch (error) {
    console.error('List lab orders error:', error.message);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── POST /api/labs/orders ─────────────────────────────────────────────────────
router.post('/orders', [
  body('patient_id').isUUID(),
  body('work_type').isIn(WORK_TYPES),
  body('due_date').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    const models   = await getModels();
    const LabOrder = models.LabOrder;
    if (!LabOrder) return res.status(500).json({ error: 'Modèle LabOrder non disponible' });

    const clinicId = getClinicId(req);
    const userId   = getUserId(req);
    const { patient_id, work_type, due_date, lab_name, shade, lab_cost_mga, notes } = req.body;

    const year  = new Date().getFullYear();
    const count = await LabOrder.count({ where: clinicId ? { clinic_id: clinicId } : {} });
    const orderNumber = `LAB-${year}-${String(count + 1).padStart(4, '0')}`;

    // Trouver ou creer un lab par defaut
    let labId = req.body.lab_id || null;
    if (!labId) {
      try {
        const Lab = models.Lab || models.Laboratory || models.Laboratoire;
        if (Lab) {
          const whereL = clinicId ? { clinic_id: clinicId } : {};
          let lab = await Lab.findOne({ where: whereL });
          if (!lab) {
            lab = await Lab.create({
              name: lab_name || 'Laboratoire Principal',
              ...(clinicId ? { clinic_id: clinicId } : {})
            });
          }
          labId = lab.id;
        }
      } catch (e) { console.warn('Lab find/create (non-fatal):', e.message); }
    }

    const orderData = {
      order_number: orderNumber,
      patient_id,
      work_type,
      due_date,
      lab_name:     lab_name  || null,
      shade:        shade     || null,
      lab_cost_mga: parseFloat(lab_cost_mga) || 0,
      notes:        notes     || null,
      status:       'CREATED'
    };
    if (clinicId) orderData.clinic_id  = clinicId;
    if (userId)   orderData.dentist_id = userId;
    if (labId)    orderData.lab_id     = labId;

    const order = await LabOrder.create(orderData);

    // AuditLog non-fatal
    try {
      if (models.AuditLog) {
        await models.AuditLog.create({ user_id: userId, action: 'CREATE', resource_type: 'lab_orders', resource_id: order.id, ip_address: req.ip, description: `Commande labo: ${orderNumber}` });
      }
    } catch (e) { console.warn('AuditLog (non-fatal):', e.message); }

    return res.status(201).json({ message: 'Commande créée', order });
  } catch (error) {
    console.error('Create lab order error:', error.message);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── POST /api/labs/orders/:id/status ─────────────────────────────────────────
router.post('/orders/:id/status', [
  param('id').isUUID(),
  body('status').isIn(STATUSES)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    const models   = await getModels();
    const LabOrder = models.LabOrder;
    if (!LabOrder) return res.status(500).json({ error: 'Modèle LabOrder non disponible' });

    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) };

    const order = await LabOrder.findOne({ where });
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

    await order.update({ status: req.body.status });
    return res.json({ message: 'Statut mis à jour', order });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── GET /api/labs/orders/:id/print ────────────────────────────────────────────
router.get('/orders/:id/print', [param('id').isUUID()], async (req, res) => {
  try {
    const models   = await getModels();
    const LabOrder = models.LabOrder;
    if (!LabOrder) return res.status(500).json({ error: 'Modèle non disponible' });

    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) };
    const order    = await LabOrder.findOne({ where });
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

    let patientName = '';
    try {
      if (models.Patient && order.patient_id) {
        const p = await models.Patient.findByPk(order.patient_id);
        if (p) patientName = `${p.first_name} ${p.last_name}`;
      }
    } catch (e) {}

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LAB ${order.order_number}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#0D7A87}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #eee}</style>
    </head><body>
    <h1>Commande Laboratoire — ${order.order_number}</h1>
    <table>
      <tr><th>Patient</th><td>${patientName}</td></tr>
      <tr><th>Type de travail</th><td>${order.work_type}</td></tr>
      <tr><th>Laboratoire</th><td>${order.lab_name || 'N/A'}</td></tr>
      <tr><th>Teinte</th><td>${order.shade || 'N/A'}</td></tr>
      <tr><th>Date limite</th><td>${order.due_date || 'N/A'}</td></tr>
      <tr><th>Coût</th><td>${(order.lab_cost_mga||0).toLocaleString()} MGA</td></tr>
      <tr><th>Statut</th><td>${order.status}</td></tr>
      ${order.notes ? `<tr><th>Notes</th><td>${order.notes}</td></tr>` : ''}
    </table>
    <script>window.print();</script></body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;
