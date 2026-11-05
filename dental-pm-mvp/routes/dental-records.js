/**
 * Dossier dentaire unifié : l'état des dents reste dans tooth_statuses (odontogramme),
 * les actes saisis dans l'ancienne fiche sont conservés dans dental_charts.
 * Aucun statut clinique n'est recopié automatiquement depuis les archives : le praticien
 * doit confirmer une ancienne observation avant qu'elle devienne l'état actuel.
 */
const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { QueryTypes } = require('sequelize');
const sequelize = require('../database/connection');
const { Patient, Treatment, ToothStatus, ToothHistory, AuditLog } = require('../models');

const router = express.Router();
const { VALID_FDI, LEGACY_STATUSES, VALID_TYPES, asFDI, rowFDI, parseTeeth, appendProcedure } = require('../utils/dentalRecord');
function missingChartTable(err) {
  return err?.original?.code === '42P01' || err?.parent?.code === '42P01';
}
async function checkPatient(req, res) {
  if (!req.clinic_id) {
    res.status(403).json({ error:'Cabinet non identifié' });
    return false;
  }
  const patient = await Patient.findOne({ where: { id:req.params.patientId, clinic_id:req.clinic_id } });
  if (!patient) {
    res.status(404).json({ error:'Patient non trouvé dans ce cabinet' });
    return false;
  }
  return true;
}
const patientValidation = [param('patientId').isUUID()];
const validRequest = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return true;
  res.status(400).json({ error:'Données invalides', details:errors.array() });
  return false;
};

router.get('/dental-records/:patientId', patientValidation, async (req, res) => {
  try {
    if (!validRequest(req, res) || !(await checkPatient(req, res))) return;
    let legacyTeeth = [];
    let legacyAvailable = true;
    try {
      const rows = await sequelize.query(
        'SELECT teeth_records FROM dental_charts WHERE patient_id = $1 AND clinic_id = $2 LIMIT 1',
        { bind:[req.params.patientId, req.clinic_id], type:QueryTypes.SELECT }
      );
      legacyTeeth = parseTeeth(rows[0]?.teeth_records);
    } catch (err) {
      if (!missingChartTable(err)) throw err;
      legacyAvailable = false; // Migration nécessaire avant d'ajouter des actes.
    }
    const procedures = {};
    const legacyStatuses = {};
    for (const tooth of legacyTeeth) {
      const fdi = rowFDI(tooth);
      if (!fdi) continue;
      if (!procedures[fdi]) procedures[fdi] = [];
      for (const procedure of Array.isArray(tooth.procedures) ? tooth.procedures : []) {
        procedures[fdi].push({ ...procedure, source:'legacy_chart' });
      }
      if (LEGACY_STATUSES[tooth.status] && (tooth.status !== 'healthy' || tooth.notes)) {
        legacyStatuses[fdi] = {
          status:LEGACY_STATUSES[tooth.status],
          note:tooth.notes || '',
          source:'ancienne_fiche_non_confirmee'
        };
      }
    }
    // Les actes structurés existants restent visibles, sans être déplacés ni modifiés.
    const treatments = await Treatment.findAll({
      where:{ patient_id:req.params.patientId, clinic_id:req.clinic_id },
      order:[['treatment_date','DESC']],
      limit:300
    });
    for (const treatment of treatments) {
      const raw = String(treatment.tooth_numbers || '').split(/[;,\s]+/).filter(Boolean);
      for (const number of raw) {
        const fdi = asFDI(number);
        if (!fdi) continue;
        if (!procedures[fdi]) procedures[fdi] = [];
        procedures[fdi].push({
          id:treatment.id,
          source:'treatment',
          procedure_type:'other',
          procedure_name:'Traitement enregistré',
          description:treatment.treatment_notes || '',
          treatment_plan:treatment.treatment_plan || '',
          cost_mga:treatment.cost_mga,
          date_performed:treatment.treatment_date,
          status:treatment.status
        });
      }
    }
    return res.json({ patient_id:req.params.patientId, procedures, legacy_statuses:legacyStatuses, legacy_available:legacyAvailable });
  } catch (err) {
    console.error('Dossier dentaire / lecture:', err);
    return res.status(500).json({ error:'Impossible de charger les actes dentaires' });
  }
});

router.post('/dental-records/:patientId/procedures', [
  ...patientValidation,
  body('tooth_fdi').custom(value => VALID_FDI.has(String(value))),
  body('procedure_type').isIn([...VALID_TYPES]),
  body('procedure_name').isString().trim().isLength({ min:1, max:200 }),
  body('description').optional({ nullable:true }).isString().isLength({ max:4000 }),
  body('notes').optional({ nullable:true }).isString().isLength({ max:4000 }),
  body('cost_mga').isFloat({ min:0, max:9999999999 }),
  body('date_performed').isISO8601({ strict:true }),
  body('status').isIn(['PLANNED','COMPLETED'])
], async (req, res) => {
  if (!validRequest(req, res)) return;
  try {
    if (!(await checkPatient(req, res))) return;
    const toothFdi = String(req.body.tooth_fdi);
    const procedure = {
      procedure_type:req.body.procedure_type,
      procedure_name:req.body.procedure_name.trim(),
      description:req.body.description || '',
      notes:req.body.notes || '',
      cost_mga:Number(req.body.cost_mga),
      date_performed:req.body.date_performed,
      status:req.body.status,
      created_at:new Date().toISOString(),
      created_by:req.user?.id || null
    };
    await sequelize.transaction(async transaction => {
      const rows = await sequelize.query(
        'SELECT id, teeth_records FROM dental_charts WHERE patient_id = $1 AND clinic_id = $2 LIMIT 1 FOR UPDATE',
        { bind:[req.params.patientId, req.clinic_id], type:QueryTypes.SELECT, transaction }
      );
      const teeth = appendProcedure(parseTeeth(rows[0]?.teeth_records), toothFdi, procedure);
      if (rows.length) {
        await sequelize.query(
          'UPDATE dental_charts SET teeth_records = $1, updated_at = NOW() WHERE id = $2 AND clinic_id = $3',
          { bind:[JSON.stringify(teeth), rows[0].id, req.clinic_id], transaction }
        );
      } else {
        await sequelize.query(
          'INSERT INTO dental_charts (id, patient_id, clinic_id, teeth_records, created_at, updated_at) VALUES (uuid_generate_v4(), $1, $2, $3, NOW(), NOW())',
          { bind:[req.params.patientId, req.clinic_id, JSON.stringify(teeth)], transaction }
        );
      }
    });
    // Journalisation complémentaire non bloquante; ne change pas l'état actuel.
    try {
      const currentStatus = await ToothStatus.findOne({ where:{ patient_id:req.params.patientId, clinic_id:req.clinic_id, tooth_fdi:toothFdi } });
      await ToothHistory.create({ patient_id:req.params.patientId, clinic_id:req.clinic_id,
        tooth_fdi:toothFdi, action:'PROCEDURE_ADDED', note:procedure.procedure_name,
        status:currentStatus?.status || 'HEALTHY', surface:currentStatus?.surface || null,
        performed_by:req.user?.id || null });
    } catch (err) { console.warn('Historique acte non disponible:', err.message); }
    try {
      await AuditLog.create({ user_id:req.user?.id || null, action:'CREATE',
        resource_type:'dental_procedure', resource_id:req.params.patientId,
        new_values:{ tooth_fdi:toothFdi, procedure_name:procedure.procedure_name },
        description:'Ajout acte au dossier dentaire', ip_address:req.ip });
    } catch (err) { console.warn('Audit dossier non disponible:', err.message); }
    return res.status(201).json({ message:'Acte enregistré', procedure });
  } catch (err) {
    if (missingChartTable(err)) {
      return res.status(503).json({ error:'Table des anciennes fiches absente : appliquer la migration dental_charts avant de saisir des actes.' });
    }
    if (err?.original?.code === '23505' || err?.parent?.code === '23505') {
      return res.status(409).json({ error:'Modification simultanée : rechargez le dossier et réessayez.' });
    }
    console.error('Dossier dentaire / ajout acte:', err);
    return res.status(500).json({ error:'Impossible d’enregistrer l’acte' });
  }
});

module.exports = router;
