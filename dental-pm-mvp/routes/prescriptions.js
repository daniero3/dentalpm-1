const express = require('express');
const jwt = require('jsonwebtoken');
const { param, body, validationResult } = require('express-validator');
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

async function getModels() {
  const models = require('../models');
  return models;
}

async function generatePrescriptionNumber(Prescription, clinicId) {
  const year   = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  try {
    const last = await Prescription.findOne({
      where: { ...(clinicId ? { clinic_id: clinicId } : {}), number: { [Op.iLike]: `${prefix}%` } },
      order: [['created_at', 'DESC']]
    });
    let next = 1;
    if (last) {
      const parts = last.number.split('-');
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n)) next = n + 1;
    }
    return `${prefix}${String(next).padStart(4, '0')}`;
  } catch (e) {
    return `${prefix}${Date.now().toString().slice(-4)}`;
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
router.post('/patients/:patientId/prescriptions', [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    const { Prescription, Patient } = await getModels();
    const clinicId = getClinicId(req);
    const userId   = getUserId(req);

    // Vérifier patient
    const patient = await Patient.findOne({
      where: { id: req.params.patientId, ...(clinicId ? { clinic_id: clinicId } : {}) }
    });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const number = await generatePrescriptionNumber(Prescription, clinicId);
    const { content, notes, status } = req.body;

    // Creer avec les champs minimaux — colonnes optionnelles en try/catch
    const baseData = {
      patient_id: req.params.patientId,
      number,
    };
    // Ajouter colonnes optionnelles une par une
    if (clinicId) baseData.clinic_id = clinicId;
    baseData.content_json = content || {};
    try { baseData.notes      = notes   || null; } catch(e) {}
    try { baseData.status     = status  || 'DRAFT'; } catch(e) {}
    try { baseData.issued_at  = new Date(); } catch(e) {}
    if (userId) baseData.prescriber_id = userId;  // ✅ bon nom de colonne
    

    const prescription = await Prescription.create(baseData);

    // Log non-fatal
    try {
      const models = await getModels();
      if (models.PrescriptionLog) {
        await models.PrescriptionLog.create({
          prescription_id: prescription.id,
          action:  'CREATE',
          user_id: userId,
          ...(clinicId ? { clinic_id: clinicId } : {})
        });
      }
    } catch (e) { console.warn('PrescriptionLog (non-fatal):', e.message); }

    return res.status(201).json({
      message: 'Ordonnance créée',
      prescription: { ...prescription.dataValues, patient: { id: patient.id, first_name: patient.first_name, last_name: patient.last_name } }
    });
  } catch (error) {
    console.error('Create prescription error FULL:', JSON.stringify(error.errors || error.message));
    return res.status(500).json({ error: 'Erreur serveur', details: error.message, fields: error.errors?.map(e => e.path) });
  }
});

// ── GET all ──────────────────────────────────────────────────────────────────
router.get('/patients/:patientId/prescriptions', [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const { Prescription, Patient } = await getModels();
    const clinicId = getClinicId(req);
    const where    = { patient_id: req.params.patientId, ...(clinicId ? { clinic_id: clinicId } : {}) };

    // Fetch sans include pour eviter erreurs d'association
    const prescriptions = await Prescription.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    // Ajouter infos patient manuellement
    let patientInfo = null;
    try {
      const p = await Patient.findByPk(req.params.patientId, { attributes: ['id','first_name','last_name'] });
      patientInfo = p?.dataValues || null;
    } catch (e) {}

    const result = prescriptions.map(p => ({
      ...p.dataValues,
      patient: patientInfo
    }));

    return res.json({ prescriptions: result, count: result.length });
  } catch (error) {
    console.error('Get prescriptions error:', error.message);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── GET one ──────────────────────────────────────────────────────────────────
router.get('/patients/:patientId/prescriptions/:id', [
  param('patientId').isUUID(), param('id').isUUID()
], async (req, res) => {
  try {
    const { Prescription, Patient } = await getModels();
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, patient_id: req.params.patientId, ...(clinicId ? { clinic_id: clinicId } : {}) };

    const prescription = await Prescription.findOne({ where });
    if (!prescription) return res.status(404).json({ error: 'Ordonnance non trouvée' });

    let patientInfo = null;
    try {
      const p = await Patient.findByPk(req.params.patientId, { attributes: ['id','first_name','last_name'] });
      patientInfo = p?.dataValues || null;
    } catch (e) {}

    return res.json({ prescription: { ...prescription.dataValues, patient: patientInfo } });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── PUT ───────────────────────────────────────────────────────────────────────
router.put('/patients/:patientId/prescriptions/:id', [
  param('patientId').isUUID(), param('id').isUUID()
], async (req, res) => {
  try {
    const { Prescription } = await getModels();
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, patient_id: req.params.patientId, ...(clinicId ? { clinic_id: clinicId } : {}) };

    const prescription = await Prescription.findOne({ where });
    if (!prescription) return res.status(404).json({ error: 'Ordonnance non trouvée' });

    const updates = {};
    if (req.body.content !== undefined) updates.content   = req.body.content;
    if (req.body.notes   !== undefined) updates.notes     = req.body.notes;
    if (req.body.status  !== undefined) {
      updates.status = req.body.status;
      if (req.body.status === 'ISSUED') updates.issued_at = new Date();
    }
    await prescription.update(updates);
    return res.json({ message: 'Ordonnance mise à jour', prescription });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── DELETE ────────────────────────────────────────────────────────────────────
router.delete('/patients/:patientId/prescriptions/:id', [
  param('patientId').isUUID(), param('id').isUUID()
], async (req, res) => {
  try {
    const { Prescription } = await getModels();
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, patient_id: req.params.patientId, ...(clinicId ? { clinic_id: clinicId } : {}) };

    const prescription = await Prescription.findOne({ where });
    if (!prescription) return res.status(404).json({ error: 'Ordonnance non trouvée' });
    await prescription.destroy();
    return res.json({ message: 'Ordonnance supprimée' });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── PRINT ─────────────────────────────────────────────────────────────────────
router.get('/patients/:patientId/prescriptions/:id/print', [
  param('patientId').isUUID(), param('id').isUUID()
], async (req, res) => {
  try {
    const { Prescription, Patient } = await getModels();
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, patient_id: req.params.patientId, ...(clinicId ? { clinic_id: clinicId } : {}) };

    const prescription = await Prescription.findOne({ where });
    if (!prescription) return res.status(404).json({ error: 'Ordonnance non trouvée' });

    let patient = null;
    try { patient = await Patient.findByPk(req.params.patientId); } catch(e) {}

    const items = prescription.content?.items || [];
    const html  = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Ordonnance ${prescription.number}</title>
    <style>body{font-family:Arial,sans-serif;padding:30px;font-size:13px}h1{color:#0D7A87}.patient{background:#f8fafc;padding:12px;border-radius:8px;margin:16px 0}.item{padding:8px 0;border-bottom:1px solid #eee}.item-name{font-weight:bold}@media print{body{padding:0}}</style>
    </head><body>
    <h1>ORDONNANCE — ${prescription.number}</h1>
    <p>Date: ${new Date(prescription.issued_at || prescription.created_at).toLocaleDateString('fr-FR')}</p>
    <div class="patient"><strong>Patient:</strong> ${patient?.first_name || ''} ${patient?.last_name || ''}</div>
    ${items.map(item => `<div class="item"><div class="item-name">${item.medication||item.name||''}</div><div>${item.dosage||''} ${item.frequency||''} ${item.duration||''}</div></div>`).join('')}
    ${prescription.notes ? `<p><em>Notes: ${prescription.notes}</em></p>` : ''}
    <div style="margin-top:40px;text-align:right"><p>Signature: ____________________</p></div>
    <script>window.print();</script></body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});



// ── POST /api/prescriptions/:id/issue ────────────────────────────────────────
router.post('/:id/issue', [param('id').isUUID()], async (req, res) => {
  try {
    const { Prescription } = await getModels();
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) };
    const prescription = await Prescription.findOne({ where });
    if (!prescription) return res.status(404).json({ error:'Ordonnance non trouvée' });

    await prescription.update({ status:'ISSUED', issued_at: new Date() });
    return res.json({ message:'Ordonnance émise', prescription });
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── POST /api/prescriptions/:id/cancel ───────────────────────────────────────
router.post('/:id/cancel', [param('id').isUUID()], async (req, res) => {
  try {
    const { Prescription } = await getModels();
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) };
    const prescription = await Prescription.findOne({ where });
    if (!prescription) return res.status(404).json({ error:'Ordonnance non trouvée' });

    await prescription.update({ status:'CANCELLED' });
    return res.json({ message:'Ordonnance annulée', prescription });
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── GET /api/prescriptions/:id/pdf (route directe) ───────────────────────────
router.get('/:id/pdf', [param('id').isUUID()], async (req, res) => {
  try {
    const { Prescription, Patient } = await getModels();
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) };

    const prescription = await Prescription.findOne({ where });
    if (!prescription) return res.status(404).json({ error: 'Ordonnance non trouvée' });

    let patient = null;
    try { patient = await Patient.findByPk(prescription.patient_id); } catch(e) {}

    const items = prescription.content_json?.items || prescription.content?.items || [];
    const html  = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Ordonnance ${prescription.number}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;font-size:13px;color:#333}
      .header{border-bottom:2px solid #0D7A87;padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between}
      .title{font-size:22px;font-weight:bold;color:#0D7A87}
      .number{font-size:14px;color:#555}
      .patient{background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:20px;border-left:4px solid #0D7A87}
      .item{padding:10px 0;border-bottom:1px solid #eee}
      .item-name{font-weight:bold;font-size:14px;color:#0D7A87}
      .item-detail{color:#555;margin-top:4px;font-size:12px}
      .footer{margin-top:40px;display:flex;justify-content:flex-end}
      .sign{text-align:center;border-top:1px solid #333;padding-top:8px;width:200px}
      @media print{body{padding:0}}
    </style>
    </head><body>
    <div class="header">
      <div>
        <div class="title">ORDONNANCE</div>
        <div class="number">${prescription.number}</div>
      </div>
      <div style="text-align:right;color:#555;font-size:12px">
        <div>Date: ${new Date(prescription.issued_at || prescription.created_at).toLocaleDateString('fr-FR')}</div>
      </div>
    </div>
    <div class="patient">
      <strong>Patient:</strong> ${patient?.first_name || ''} ${patient?.last_name || ''}
    </div>
    <div>
      ${items.length > 0 ? items.map(item => `
        <div class="item">
          <div class="item-name">${item.medication || item.name || item.drug || ''}</div>
          <div class="item-detail">
            ${item.dosage    ? `<span>Dosage: ${item.dosage}</span>` : ''}
            ${item.frequency ? `<span> &bull; ${item.frequency}</span>` : ''}
            ${item.duration  ? `<span> &bull; Durée: ${item.duration}</span>` : ''}
          </div>
          ${item.instructions ? `<div class="item-detail">${item.instructions}</div>` : ''}
        </div>`).join('') : '<p style="color:#999">Aucun médicament prescrit</p>'}
    </div>
    ${prescription.notes ? `<p style="margin-top:16px;color:#666;font-style:italic">Notes: ${prescription.notes}</p>` : ''}
    <div class="footer">
      <div class="sign">
        <div style="height:48px"></div>
        <div>Signature du praticien</div>
      </div>
    </div>
    <script>window.print();</script>
    </body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('PDF prescription error:', error.message);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── GET /api/prescriptions/:id/print (alias) ─────────────────────────────────
router.get('/:id/print', [param('id').isUUID()], async (req, res) => {
  req.params = { ...req.params, id: req.params.id };
  // Reutiliser la meme logique que /pdf
  const { Prescription, Patient } = await getModels().catch(() => ({}));
  if (!Prescription) return res.status(500).json({ error: 'Modele non disponible' });
  const clinicId = getClinicId(req);
  const where    = { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) };
  const prescription = await Prescription.findOne({ where }).catch(() => null);
  if (!prescription) return res.status(404).json({ error: 'Ordonnance non trouvée' });
  res.redirect(`/api/prescriptions/${req.params.id}/pdf`);
});

module.exports = router;
