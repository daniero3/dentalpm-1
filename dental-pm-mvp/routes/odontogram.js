const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { ToothStatus, ToothHistory, Patient, User, AuditLog } = require('../models');

const router = express.Router();

const VALID_FDI = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48'
];

const VALID_STATUSES = [
  'HEALTHY','CARIES','FILLED','CROWN','MISSING',
  'IMPLANT','ROOT_CANAL','EXTRACTION_NEEDED','BRIDGE'
];

// ✅ Helper — clinic_id depuis toutes les sources possibles
const getClinicId = (req) =>
  req.clinic_id
  || req.user?.clinic_id
  || req.user?.dataValues?.clinic_id
  || null;

// ✅ Helper — user_id depuis toutes les sources possibles
const getUserId = (req) =>
  req.user?.id
  || req.user?.dataValues?.id
  || req.user?.userId
  || null;

/**
 * GET /api/patients/:patientId/odontogram
 */
router.get('/patients/:patientId/odontogram', [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);

    // Trouver le patient (avec ou sans clinic_id)
    const wherePatient = { id: req.params.patientId };
    if (clinicId) wherePatient.clinic_id = clinicId;

    const patient = await Patient.findOne({ where: wherePatient });
    if (!patient) return res.status(404).json({ error:'Patient non trouvé' });

    const teeth = await ToothStatus.findAll({
      where: {
        patient_id: req.params.patientId,
        ...(clinicId ? { clinic_id: clinicId } : {})
      },
      include: [{ model: User, as: 'updatedBy', attributes: ['id','full_name','username'], required: false }],
      order: [['tooth_fdi', 'ASC']]
    });

    const odontogram = {};
    teeth.forEach(t => {
      odontogram[t.tooth_fdi] = {
        id: t.id, tooth_fdi: t.tooth_fdi,
        surface: t.surface, status: t.status,
        note: t.note, updated_by: t.updatedBy,
        updated_at: t.updatedAt
      };
    });

    return res.json({ patient_id: req.params.patientId, count: teeth.length, odontogram });
  } catch (error) {
    console.error('Get odontogram error:', error);
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

/**
 * PUT /api/patients/:patientId/odontogram
 */
router.put('/patients/:patientId/odontogram', [
  param('patientId').isUUID(),
  body('teeth').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const userId   = getUserId(req);

    console.log('[odontogram PUT] clinicId:', clinicId, '| userId:', userId);

    // Trouver le patient
    const wherePatient = { id: req.params.patientId };
    if (clinicId) wherePatient.clinic_id = clinicId;

    const patient = await Patient.findOne({ where: wherePatient });
    if (!patient) return res.status(404).json({ error:'Patient non trouvé' });

    const { teeth } = req.body;
    const results = { created:0, updated:0, skipped:0 };

    for (const tooth of teeth) {
      if (!tooth.tooth_fdi || !VALID_FDI.includes(String(tooth.tooth_fdi))) {
        results.skipped++; continue;
      }
      if (tooth.status && !VALID_STATUSES.includes(tooth.status)) {
        results.skipped++; continue;
      }

      try {
        const whereClause = {
          patient_id: req.params.patientId,
          tooth_fdi:  String(tooth.tooth_fdi)
        };
        if (clinicId) whereClause.clinic_id = clinicId;

        const defaults = {
          patient_id:  req.params.patientId,
          tooth_fdi:   String(tooth.tooth_fdi),
          surface:     tooth.surface || null,
          status:      tooth.status  || 'HEALTHY',
          note:        tooth.note    || null,
          updated_by:  userId
        };
        if (clinicId) defaults.clinic_id = clinicId;

        const [record, created] = await ToothStatus.findOrCreate({
          where: whereClause,
          defaults
        });

        if (!created) {
          await record.update({
            surface:    tooth.surface !== undefined ? (tooth.surface || null) : record.surface,
            status:     tooth.status  || record.status,
            note:       tooth.note    !== undefined ? tooth.note : record.note,
            updated_by: userId
          });
          results.updated++;
        } else {
          results.created++;
        }

        // Historique non-fatal
        try {
          const histDefaults = {
            patient_id:   req.params.patientId,
            tooth_fdi:    String(tooth.tooth_fdi),
            surface:      tooth.surface || null,
            status:       tooth.status  || 'HEALTHY',
            note:         tooth.note    || null,
            action:       created ? 'CREATE' : 'UPDATE',
            performed_by: userId
          };
          if (clinicId) histDefaults.clinic_id = clinicId;
          await ToothHistory.create(histDefaults);
        } catch (h) { console.warn('History (non-fatal):', h.message); }

      } catch (e) {
        console.error(`Tooth ${tooth.tooth_fdi} error:`, e.message);
        results.skipped++;
      }
    }

    // AuditLog non-fatal
    try {
      await AuditLog.create({
        user_id: userId, action:'UPDATE',
        resource_type:'odontogram', resource_id: req.params.patientId,
        new_values: results, ip_address: req.ip,
        description:`Odontogramme: ${results.created} créés, ${results.updated} modifiés`
      });
    } catch (e) { console.warn('AuditLog (non-fatal):', e.message); }

    return res.json({ message:'Odontogramme mis à jour', results });
  } catch (error) {
    console.error('Update odontogram error:', error);
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

/**
 * GET /api/patients/:patientId/odontogram/history
 */
router.get('/patients/:patientId/odontogram/history', [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const whereClause = { patient_id: req.params.patientId };
    if (clinicId) whereClause.clinic_id = clinicId;

    const history = await ToothHistory.findAll({
      where: whereClause,
      include: [{ model: User, as: 'performedBy', attributes: ['id','full_name','username'], required: false }],
      order: [['created_at','DESC']], limit: 100
    });

    return res.json({ patient_id: req.params.patientId, count: history.length, history });
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

/**
 * POST /api/patients/:patientId/odontogram/history
 */
router.post('/patients/:patientId/odontogram/history', [
  param('patientId').isUUID(),
  body('tooth_fdi').isIn(VALID_FDI),
  body('action').notEmpty(),
  body('status').optional().isIn(VALID_STATUSES)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const userId   = getUserId(req);
    const { tooth_fdi, surface, status, note, action } = req.body;

    const histData = {
      patient_id: req.params.patientId,
      tooth_fdi, surface: surface||null,
      status: status||'HEALTHY', note: note||null,
      action, performed_by: userId
    };
    if (clinicId) histData.clinic_id = clinicId;

    const history = await ToothHistory.create(histData);
    return res.status(201).json({ message:'Historique ajouté', history: { id: history.id, tooth_fdi: history.tooth_fdi, action: history.action } });
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

module.exports = router;
