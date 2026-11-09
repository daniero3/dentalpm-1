const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { ToothStatus, ToothHistory, Patient, User, AuditLog } = require('../models');
const sequelize = require('../database/connection');

const router = express.Router();

const VALID_FDI = [
  '11','12','13','14','15','16','17','18',
  '21','22','23','24','25','26','27','28',
  '31','32','33','34','35','36','37','38',
  '41','42','43','44','45','46','47','48',
  '51','52','53','54','55',
  '61','62','63','64','65',
  '71','72','73','74','75',
  '81','82','83','84','85'
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
 * Sauvegarde atomique des dents et de leur historique.
 */
router.put('/patients/:patientId/odontogram', [
  param('patientId').isUUID(),
  body('teeth').isArray({ min: 1, max: 52 })
], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Données invalides'
    });
  }

  const clinicId = getClinicId(req);
  const userId = getUserId(req);

  if (!clinicId || !userId) {
    return res.status(403).json({
      error: 'Cabinet ou utilisateur non identifié'
    });
  }

  const teeth = req.body.teeth;
  const seen = new Set();

  // Vérifier toutes les dents avant la première écriture.
  for (const tooth of teeth) {
    if (
      !tooth ||
      typeof tooth !== 'object' ||
      Array.isArray(tooth)
    ) {
      return res.status(400).json({
        error: 'Dent invalide'
      });
    }

    const fdi = String(tooth.tooth_fdi ?? '');

    if (
      !VALID_FDI.includes(fdi) ||
      seen.has(fdi) ||
      !VALID_STATUSES.includes(tooth.status) ||
      (
        tooth.surface != null &&
        (
          typeof tooth.surface !== 'string' ||
          tooth.surface.length > 20
        )
      ) ||
      (
        tooth.note != null &&
        (
          typeof tooth.note !== 'string' ||
          tooth.note.length > 10000
        )
      )
    ) {
      return res.status(400).json({
        error: 'Dent, état ou champ invalide, ou dent répétée'
      });
    }

    seen.add(fdi);
  }

  try {
    const results = await sequelize.transaction(
      async (transaction) => {
        // Sérialiser les écritures de ce patient dans cette route.
        const patient = await Patient.findOne({
          where: {
            id: req.params.patientId,
            clinic_id: clinicId
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!patient) {
          const error = new Error(
            'Patient non trouvé dans ce cabinet'
          );
          error.httpStatus = 404;
          throw error;
        }

        const counts = {
          created: 0,
          updated: 0,
          skipped: 0
        };

        for (const tooth of teeth) {
          const fdi = String(tooth.tooth_fdi);

          const where = {
            patient_id: req.params.patientId,
            clinic_id: clinicId,
            tooth_fdi: fdi
          };

          const defaults = {
            ...where,
            status: tooth.status,
            surface: tooth.surface || null,
            note: tooth.note || null,
            updated_by: userId
          };

          const [record, created] =
            await ToothStatus.findOrCreate({
              where,
              defaults,
              transaction
            });

          if (!created) {
            const changes = {
              status: tooth.status,
              updated_by: userId
            };

            if (Object.hasOwn(tooth, 'surface')) {
              changes.surface = tooth.surface || null;
            }

            if (Object.hasOwn(tooth, 'note')) {
              changes.note = tooth.note || null;
            }

            await record.update(changes, {
              transaction
            });
          }

          // L'historique appartient à la même transaction.
          await ToothHistory.create({
            patient_id: req.params.patientId,
            clinic_id: clinicId,
            tooth_fdi: fdi,
            status: record.status,
            surface: record.surface || null,
            note: record.note || null,
            action: created ? 'CREATE' : 'UPDATE',
            performed_by: userId
          }, {
            transaction
          });

          if (created) {
            counts.created += 1;
          } else {
            counts.updated += 1;
          }
        }

        // Trace d'audit sans divulguer les notes cliniques.
        await AuditLog.create({
          user_id: userId,
          clinic_id: clinicId,
          action: 'UPDATE',
          resource_type: 'odontogram',
          resource_id: req.params.patientId,
          new_values: counts,
          ip_address: req.ip,
          description: 'Enregistrement de l’odontogramme'
        }, {
          transaction
        });

        return counts;
      }
    );

    return res.json({
      message: 'Odontogramme enregistré',
      results
    });

  } catch (error) {
    console.error(
      'Odontogram transaction error:',
      error.name
    );

    return res.status(error.httpStatus || 500).json({
      error: error.httpStatus
        ? 'Patient non trouvé dans ce cabinet'
        : 'Enregistrement non confirmé. Vérifiez avant de réessayer.'
    });
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
