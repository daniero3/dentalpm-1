const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Prescription, Patient, User, Clinic } = require('../models');

const router = express.Router();

const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
const getUserId   = (req) => req.user?.id   || req.user?.dataValues?.id || req.user?.userId || null;

async function generatePrescriptionNumber(clinicId) {
  const year   = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  try {
    const last = await Prescription.findOne({
      where: { ...(clinicId ? { clinic_id: clinicId } : {}), number: { [Op.iLike]: `${prefix}%` } },
      order: [['created_at','DESC']]
    });
    let next = 1;
    if (last) {
      const parts = last.number.split('-');
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n)) next = n + 1;
    }
    return `${prefix}${String(next).padStart(4,'0')}`;
  } catch (e) {
    return `${prefix}${Date.now().toString().slice(-4)}`;
  }
}

async function logAction(clinicId, prescriptionId, action, userId, meta = {}) {
  try {
    const { PrescriptionLog } = require('../models');
    await PrescriptionLog.create({ clinic_id: clinicId, prescription_id: prescriptionId, action, user_id: userId, meta_json: meta });
  } catch (e) { console.warn('PrescriptionLog (non-fatal):', e.message); }
}

// ── POST /api/patients/:patientId/prescriptions ───────────────────────────────
router.post('/patients/:patientId/prescriptions', [
  param('patientId').isUUID(),
  body('content').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const userId   = getUserId(req);

    const wherePatient = { id: req.params.patientId };
    if (clinicId) wherePatient.clinic_id = clinicId;
    const patient = await Patient.findOne({ where: wherePatient });
    if (!patient) return res.status(404).json({ error:'Patient non trouvé' });

    const number = await generatePrescriptionNumber(clinicId);
    const { content, notes, status } = req.body;

    const prescription = await Prescription.create({
      number,
      patient_id:   req.params.patientId,
      clinic_id:    clinicId,
      practitioner_id: userId,
      content:      content || {},
      notes:        notes   || null,
      status:       status  || 'DRAFT',
      issued_at:    new Date()
    });

    await logAction(clinicId, prescription.id, 'CREATE', userId);

    const complete = await Prescription.findByPk(prescription.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id','first_name','last_name'], required: false },
        { model: User,    as: 'practitioner', attributes: ['id','full_name'], required: false }
      ]
    });

    return res.status(201).json({ message:'Ordonnance créée', prescription: complete });
  } catch (error) {
    console.error('Create prescription error:', error);
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── GET /api/patients/:patientId/prescriptions ────────────────────────────────
router.get('/patients/:patientId/prescriptions', [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const where    = { patient_id: req.params.patientId };
    if (clinicId) where.clinic_id = clinicId;

    const prescriptions = await Prescription.findAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id','first_name','last_name'], required: false },
        { model: User,    as: 'practitioner', attributes: ['id','full_name','username'], required: false }
      ],
      order: [['created_at','DESC']]
    });

    return res.json({ prescriptions, count: prescriptions.length });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── GET /api/patients/:patientId/prescriptions/:id ────────────────────────────
router.get('/patients/:patientId/prescriptions/:id', [
  param('patientId').isUUID(),
  param('id').isUUID()
], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, patient_id: req.params.patientId };
    if (clinicId) where.clinic_id = clinicId;

    const prescription = await Prescription.findOne({
      where,
      include: [
        { model: Patient, as: 'patient', required: false },
        { model: User,    as: 'practitioner', attributes: ['id','full_name'], required: false },
        { model: Clinic,  as: 'clinic', attributes: ['id','name','address','phone'], required: false }
      ]
    });

    if (!prescription) return res.status(404).json({ error:'Ordonnance non trouvée' });
    return res.json({ prescription });
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── PUT /api/patients/:patientId/prescriptions/:id ────────────────────────────
router.put('/patients/:patientId/prescriptions/:id', [
  param('patientId').isUUID(),
  param('id').isUUID(),
  body('content').optional().isObject(),
  body('status').optional().isIn(['DRAFT','ISSUED','CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const userId   = getUserId(req);
    const where    = { id: req.params.id, patient_id: req.params.patientId };
    if (clinicId) where.clinic_id = clinicId;

    const prescription = await Prescription.findOne({ where });
    if (!prescription) return res.status(404).json({ error:'Ordonnance non trouvée' });

    const { content, notes, status } = req.body;
    const updates = {};
    if (content !== undefined) updates.content = content;
    if (notes   !== undefined) updates.notes   = notes;
    if (status  !== undefined) {
      updates.status = status;
      if (status === 'ISSUED') updates.issued_at = new Date();
    }

    await prescription.update(updates);
    await logAction(clinicId, prescription.id, 'UPDATE', userId, { status });

    return res.json({ message:'Ordonnance mise à jour', prescription });
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── DELETE /api/patients/:patientId/prescriptions/:id ─────────────────────────
router.delete('/patients/:patientId/prescriptions/:id', [
  param('patientId').isUUID(),
  param('id').isUUID()
], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, patient_id: req.params.patientId };
    if (clinicId) where.clinic_id = clinicId;

    const prescription = await Prescription.findOne({ where });
    if (!prescription) return res.status(404).json({ error:'Ordonnance non trouvée' });

    await prescription.destroy();
    return res.json({ message:'Ordonnance supprimée' });
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── GET /api/patients/:patientId/prescriptions/:id/print ─────────────────────
router.get('/patients/:patientId/prescriptions/:id/print', [
  param('patientId').isUUID(),
  param('id').isUUID()
], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, patient_id: req.params.patientId };
    if (clinicId) where.clinic_id = clinicId;

    const prescription = await Prescription.findOne({
      where,
      include: [
        { model: Patient, as: 'patient', required: false },
        { model: User,    as: 'practitioner', attributes: ['id','full_name','specialization'], required: false },
        { model: Clinic,  as: 'clinic', attributes: ['id','name','address','phone'], required: false }
      ]
    });
    if (!prescription) return res.status(404).json({ error:'Ordonnance non trouvée' });

    const p = prescription.patient;
    const d = prescription.practitioner;
    const c = prescription.clinic;
    const items = prescription.content?.items || [];

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Ordonnance ${prescription.number}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;font-size:13px}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #0D7A87;padding-bottom:16px;margin-bottom:20px}
      .clinic h2{color:#0D7A87;margin:0 0 4px}
      .number{text-align:right;font-size:18px;font-weight:bold;color:#0D7A87}
      .patient{background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:20px}
      .item{padding:10px 0;border-bottom:1px solid #eee}
      .item-name{font-weight:bold;font-size:14px}
      .item-detail{color:#555;margin-top:4px}
      .footer{margin-top:40px;text-align:right}
      @media print{body{padding:0}}
    </style></head><body>
    <div class="header">
      <div class="clinic">
        <h2>${c?.name || 'Cabinet Dentaire'}</h2>
        <p>${c?.address || ''}</p>
        <p>${c?.phone || ''}</p>
        ${d ? `<p>Dr. ${d.full_name}${d.specialization ? ` — ${d.specialization}` : ''}</p>` : ''}
      </div>
      <div>
        <div class="number">ORDONNANCE</div>
        <p>${prescription.number}</p>
        <p>Le ${new Date(prescription.issued_at || prescription.created_at).toLocaleDateString('fr-FR')}</p>
      </div>
    </div>
    <div class="patient">
      <strong>Patient :</strong> ${p?.first_name || ''} ${p?.last_name || ''}
    </div>
    <div>
      ${items.length > 0 ? items.map(item => `
        <div class="item">
          <div class="item-name">${item.medication || item.name || ''}</div>
          <div class="item-detail">
            ${item.dosage    ? `Dosage: ${item.dosage}` : ''}
            ${item.frequency ? ` — ${item.frequency}` : ''}
            ${item.duration  ? ` — Durée: ${item.duration}` : ''}
          </div>
          ${item.instructions ? `<div class="item-detail">${item.instructions}</div>` : ''}
        </div>`).join('') : '<p>Aucun médicament</p>'}
    </div>
    ${prescription.notes ? `<p style="margin-top:20px"><em>Notes: ${prescription.notes}</em></p>` : ''}
    <div class="footer">
      <p>Signature du praticien</p>
      <br><br>
      <p>____________________________</p>
      ${d ? `<p>Dr. ${d.full_name}</p>` : ''}
    </div>
    <script>if(window.opener || window.print) window.print();</script>
    </body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

module.exports = router;
