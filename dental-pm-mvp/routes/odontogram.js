const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { ToothStatus, ToothHistory, Patient, User, AuditLog } = require('../models');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');

const router = express.Router();

// ✅ Middleware subscription non-fatal pour odontogram
// Laisse passer si erreur de subscription pour ne pas bloquer les soins
router.use(async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      requireValidSubscription(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    next();
  } catch (err) {
    // Si la vérification subscription échoue, laisser passer quand même
    // (évite de bloquer les soins dentaires en cours)
    console.warn('Subscription check skipped for odontogram:', err?.message);
    next();
  }
});

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

// ✅ Helper — résout req.user.id OU req.user.userId selon le token JWT
const getUserId = (req) => req.user?.id || req.user?.userId || null;

// ✅ Helper — résout req.clinic_id OU req.user.clinic_id
const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || null;

/**
 * GET /api/patients/:patientId/odontogram
 */
router.get('/patients/:patientId/odontogram', requireClinicId, [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);

    const patient = await Patient.findOne({ where: { id: req.params.patientId, clinic_id: clinicId } });
    if (!patient) return res.status(404).json({ error:'Patient non trouvé' });

    const teeth = await ToothStatus.findAll({
      where: { clinic_id: clinicId, patient_id: req.params.patientId },
      include: [{ model: User, as: 'updatedBy', attributes: ['id','full_name','username'], required: false }],
      order: [['tooth_fdi', 'ASC']]
    });

    const odontogram = {};
    teeth.forEach(t => {
      odontogram[t.tooth_fdi] = {
        id:         t.id,
        tooth_fdi:  t.tooth_fdi,
        surface:    t.surface,
        status:     t.status,
        note:       t.note,
        updated_by: t.updatedBy,
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
router.put('/patients/:patientId/odontogram', requireClinicId, [
  param('patientId').isUUID(),
  body('teeth').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    // ✅ Utiliser les helpers pour éviter undefined
    const clinicId = getClinicId(req);
    const userId   = getUserId(req);

    if (!clinicId) return res.status(403).json({ error:'clinic_id manquant dans le token' });

    const patient = await Patient.findOne({ where: { id: req.params.patientId, clinic_id: clinicId } });
    if (!patient) return res.status(404).json({ error:'Patient non trouvé' });

    const { teeth } = req.body;
    const results = { created:0, updated:0, skipped:0 };

    for (const tooth of teeth) {
      // ✅ Valider tooth_fdi
      if (!tooth.tooth_fdi || !VALID_FDI.includes(String(tooth.tooth_fdi))) {
        results.skipped++;
        continue;
      }
      // ✅ Valider status
      if (tooth.status && !VALID_STATUSES.includes(tooth.status)) {
        results.skipped++;
        continue;
      }

      try {
        const [record, created] = await ToothStatus.findOrCreate({
          where: {
            clinic_id:  clinicId,
            patient_id: req.params.patientId,
            tooth_fdi:  String(tooth.tooth_fdi)
          },
          defaults: {
            clinic_id:   clinicId,
            patient_id:  req.params.patientId,
            tooth_fdi:   String(tooth.tooth_fdi),
            surface:     tooth.surface || null,
            status:      tooth.status  || 'HEALTHY',
            note:        tooth.note    || null,
            updated_by:  userId
          }
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

        // ✅ ToothHistory — non-fatal
        try {
          await ToothHistory.create({
            clinic_id:    clinicId,
            patient_id:   req.params.patientId,
            tooth_fdi:    String(tooth.tooth_fdi),
            surface:      tooth.surface || null,
            status:       tooth.status  || 'HEALTHY',
            note:         tooth.note    || null,
            action:       created ? 'CREATE' : 'UPDATE',
            performed_by: userId
          });
        } catch (histErr) {
          console.warn('ToothHistory error (non-fatal):', histErr.message);
        }

      } catch (toothErr) {
        console.error(`Tooth ${tooth.tooth_fdi} error:`, toothErr.message);
        results.skipped++;
      }
    }

    // ✅ AuditLog — non-fatal
    try {
      await AuditLog.create({
        user_id:       userId,
        action:        'UPDATE',
        resource_type: 'odontogram',
        resource_id:   req.params.patientId,
        new_values:    { teeth_count: teeth.length, ...results },
        ip_address:    req.ip,
        description:   `Odontogramme mis à jour: ${results.created} créés, ${results.updated} modifiés, ${results.skipped} ignorés`
      });
    } catch (auditErr) {
      console.warn('AuditLog error (non-fatal):', auditErr.message);
    }

    return res.json({ message:'Odontogramme mis à jour', results });

  } catch (error) {
    console.error('Update odontogram error:', error);
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

/**
 * POST /api/patients/:patientId/odontogram/history
 */
router.post('/patients/:patientId/odontogram/history', requireClinicId, [
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

    const patient = await Patient.findOne({ where: { id: req.params.patientId, clinic_id: clinicId } });
    if (!patient) return res.status(404).json({ error:'Patient non trouvé' });

    const { tooth_fdi, surface, status, note, action } = req.body;

    const history = await ToothHistory.create({
      clinic_id:    clinicId,
      patient_id:   req.params.patientId,
      tooth_fdi,
      surface:      surface || null,
      status:       status  || 'HEALTHY',
      note:         note    || null,
      action,
      performed_by: userId
    });

    return res.status(201).json({
      message: 'Historique ajouté',
      history: { id: history.id, tooth_fdi: history.tooth_fdi, action: history.action, created_at: history.createdAt }
    });
  } catch (error) {
    console.error('Add history error:', error);
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

/**
 * GET /api/patients/:patientId/odontogram/history
 */
router.get('/patients/:patientId/odontogram/history', requireClinicId, [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const clinicId = getClinicId(req);

    const patient = await Patient.findOne({ where: { id: req.params.patientId, clinic_id: clinicId } });
    if (!patient) return res.status(404).json({ error:'Patient non trouvé' });

    const history = await ToothHistory.findAll({
      where: { clinic_id: clinicId, patient_id: req.params.patientId },
      include: [{ model: User, as: 'performedBy', attributes: ['id','full_name','username'], required: false }],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    return res.json({ patient_id: req.params.patientId, count: history.length, history });
  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

module.exports = router;
