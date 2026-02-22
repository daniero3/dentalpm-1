const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { ToothStatus, ToothHistory, Patient, User, AuditLog } = require('../models');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');

const router = express.Router();

router.use(requireValidSubscription);

const VALID_FDI = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48'
];

const VALID_STATUSES = ['HEALTHY', 'CARIES', 'FILLED', 'CROWN', 'MISSING', 'IMPLANT', 'ROOT_CANAL', 'EXTRACTION_NEEDED', 'BRIDGE'];

/**
 * GET /api/patients/:patientId/odontogram - Get patient odontogram
 */
router.get('/patients/:patientId/odontogram', requireClinicId, [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const patient = await Patient.findOne({
      where: { id: req.params.patientId, clinic_id: req.clinic_id }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const teeth = await ToothStatus.findAll({
      where: {
        clinic_id: req.clinic_id,
        patient_id: req.params.patientId
      },
      include: [
        { model: User, as: 'updatedBy', attributes: ['id', 'full_name', 'username'] }
      ],
      order: [['tooth_fdi', 'ASC']]
    });

    // Build odontogram map
    const odontogram = {};
    teeth.forEach(t => {
      odontogram[t.tooth_fdi] = {
        id: t.id,
        tooth_fdi: t.tooth_fdi,
        surface: t.surface,
        status: t.status,
        note: t.note,
        updated_by: t.updatedBy,
        updated_at: t.updatedAt
      };
    });

    res.json({
      patient_id: req.params.patientId,
      count: teeth.length,
      odontogram
    });
  } catch (error) {
    console.error('Get odontogram error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/patients/:patientId/odontogram - Upsert multiple teeth
 */
router.put('/patients/:patientId/odontogram', requireClinicId, [
  param('patientId').isUUID(),
  body('teeth').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const patient = await Patient.findOne({
      where: { id: req.params.patientId, clinic_id: req.clinic_id }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const { teeth } = req.body;
    const results = { created: 0, updated: 0 };

    for (const tooth of teeth) {
      if (!tooth.tooth_fdi || !VALID_FDI.includes(tooth.tooth_fdi)) {
        continue;
      }
      if (tooth.status && !VALID_STATUSES.includes(tooth.status)) {
        continue;
      }

      const [record, created] = await ToothStatus.findOrCreate({
        where: {
          clinic_id: req.clinic_id,
          patient_id: req.params.patientId,
          tooth_fdi: tooth.tooth_fdi
        },
        defaults: {
          clinic_id: req.clinic_id,
          patient_id: req.params.patientId,
          tooth_fdi: tooth.tooth_fdi,
          surface: tooth.surface || null,
          status: tooth.status || 'HEALTHY',
          note: tooth.note || null,
          updated_by: req.user.id
        }
      });

      if (!created) {
        await record.update({
          surface: tooth.surface || record.surface,
          status: tooth.status || record.status,
          note: tooth.note !== undefined ? tooth.note : record.note,
          updated_by: req.user.id
        });
        results.updated++;
      } else {
        results.created++;
      }

      // Log history
      await ToothHistory.create({
        clinic_id: req.clinic_id,
        patient_id: req.params.patientId,
        tooth_fdi: tooth.tooth_fdi,
        surface: tooth.surface || null,
        status: tooth.status || 'HEALTHY',
        note: tooth.note || null,
        action: created ? 'CREATE' : 'UPDATE',
        performed_by: req.user.id
      });
    }

    // Audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      resource_type: 'odontogram',
      resource_id: req.params.patientId,
      new_values: { teeth_count: teeth.length },
      ip_address: req.ip,
      description: `Odontogramme mis à jour: ${results.created} créés, ${results.updated} modifiés`
    });

    res.json({
      message: 'Odontogramme mis à jour',
      results
    });
  } catch (error) {
    console.error('Update odontogram error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * POST /api/patients/:patientId/odontogram/history - Append log entry
 */
router.post('/patients/:patientId/odontogram/history', requireClinicId, [
  param('patientId').isUUID(),
  body('tooth_fdi').isIn(VALID_FDI),
  body('action').notEmpty(),
  body('status').optional().isIn(VALID_STATUSES)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const patient = await Patient.findOne({
      where: { id: req.params.patientId, clinic_id: req.clinic_id }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const { tooth_fdi, surface, status, note, action } = req.body;

    const history = await ToothHistory.create({
      clinic_id: req.clinic_id,
      patient_id: req.params.patientId,
      tooth_fdi,
      surface: surface || null,
      status: status || 'HEALTHY',
      note: note || null,
      action,
      performed_by: req.user.id
    });

    res.status(201).json({
      message: 'Historique ajouté',
      history: {
        id: history.id,
        tooth_fdi: history.tooth_fdi,
        action: history.action,
        created_at: history.createdAt
      }
    });
  } catch (error) {
    console.error('Add history error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/patients/:patientId/odontogram/history - Get tooth history
 */
router.get('/patients/:patientId/odontogram/history', requireClinicId, [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { id: req.params.patientId, clinic_id: req.clinic_id }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const history = await ToothHistory.findAll({
      where: {
        clinic_id: req.clinic_id,
        patient_id: req.params.patientId
      },
      include: [
        { model: User, as: 'performedBy', attributes: ['id', 'full_name', 'username'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    res.json({
      patient_id: req.params.patientId,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
