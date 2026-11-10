const express = require('express');
const { isDeepStrictEqual } = require('node:util');
const { param, validationResult } = require('express-validator');
const sequelize = require('../database/connection');

const router = express.Router();

const fail = (status, message) =>
  Object.assign(new Error(message), { httpStatus: status });

function generateEmptyTeeth() {
  return Array.from({ length: 32 }, (_, i) => ({
    tooth_position: String(i + 1),
    status: null,
    procedures: [],
    notes: ''
  }));
}

function readTeethRecords(chart) {
  if (!chart) return generateEmptyTeeth();

  let records = chart.teeth_records;

  if (typeof records === 'string') {
    try {
      records = JSON.parse(records);
    } catch {
      throw fail(409, 'Fiche dentaire illisible. Aucune modification effectuée.');
    }
  }

  if (
    !Array.isArray(records) ||
    !records.every(tooth =>
      tooth &&
      typeof tooth === 'object' &&
      tooth.tooth_position != null
    )
  ) {
    throw fail(409, 'Fiche dentaire incohérente. Aucune modification effectuée.');
  }

  return records;
}

function respondError(res, error, action) {
  if (error.httpStatus) {
    return res.status(error.httpStatus).json({ error: error.message });
  }

  console.error(`Dental-chart ${action}:`, error.name);

  return res.status(500).json({
    error: 'Erreur serveur. Aucune réussite confirmée.'
  });
}

// Lecture seule : ne crée pas de fiche en base.
router.get('/patients/:patientId/dental-chart', [
  param('patientId').isUUID()
], async (req, res) => {
  if (!validationResult(req).isEmpty()) {
    return res.status(400).json({ error: 'Identifiant patient invalide' });
  }

  if (!req.clinic_id) {
    return res.status(403).json({ error: 'Cabinet non identifié' });
  }

  try {
    const [patient] = await sequelize.query(
      'SELECT id FROM patients WHERE id = $1 AND clinic_id = $2 LIMIT 1',
      {
        bind: [req.params.patientId, req.clinic_id],
        type: 'SELECT'
      }
    );

    if (!patient) {
      return res.status(404).json({
        error: 'Patient non trouvé dans ce cabinet'
      });
    }

    const [chart] = await sequelize.query(
      'SELECT id, teeth_records FROM dental_charts WHERE patient_id = $1 AND clinic_id = $2 LIMIT 1',
      {
        bind: [req.params.patientId, req.clinic_id],
        type: 'SELECT'
      }
    );

    return res.json({
      id: chart?.id || null,
      patient_id: req.params.patientId,
      teeth_records: readTeethRecords(chart)
    });
  } catch (error) {
    return respondError(res, error, 'GET');
  }
});

// Ajout contrôlé d'une procédure : ne modifie pas le statut dentaire.
router.put('/patients/:patientId/dental-chart/tooth/:toothPosition', [
  param('patientId').isUUID(),
  param('toothPosition').isInt({ min: 1, max: 32 })
], async (req, res) => {
  if (!validationResult(req).isEmpty()) {
    return res.status(400).json({ error: 'Paramètres invalides' });
  }

  if (!req.clinic_id) {
    return res.status(403).json({ error: 'Cabinet non identifié' });
  }

  const incoming = req.body?.procedures;

  if (
    !req.body ||
    Object.keys(req.body).some(key => key !== 'procedures') ||
    !Array.isArray(incoming) ||
    incoming.length < 1 ||
    incoming.length > 500
  ) {
    return res.status(400).json({ error: 'Liste de procédures invalide' });
  }

  const last = incoming[incoming.length - 1];
  const cost = Number(last?.cost_mga);

  if (
    !last ||
    typeof last !== 'object' ||
    Array.isArray(last) ||
    typeof last.procedure_type !== 'string' ||
    !last.procedure_type.trim() ||
    typeof last.procedure_name !== 'string' ||
    !last.procedure_name.trim() ||
    !Number.isFinite(cost) ||
    cost < 0
  ) {
    return res.status(400).json({
      error: 'Procédure incomplète ou coût invalide'
    });
  }

  const date = last.date_performed || '';

  if (date) {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({ error: 'Date de procédure invalide' });
    }
  }

  const newProcedure = {
    procedure_type: last.procedure_type.trim(),
    procedure_name: last.procedure_name.trim(),
    description: typeof last.description === 'string' ? last.description : '',
    cost_mga: cost,
    date_performed: date,
    notes: typeof last.notes === 'string' ? last.notes : ''
  };

  try {
    const savedTooth = await sequelize.transaction(async transaction => {
      // Le verrou patient sérialise les écritures de cette route.
      const [patient] = await sequelize.query(
        'SELECT id FROM patients WHERE id = $1 AND clinic_id = $2 FOR UPDATE',
        {
          bind: [req.params.patientId, req.clinic_id],
          type: 'SELECT',
          transaction
        }
      );

      if (!patient) {
        throw fail(404, 'Patient non trouvé dans ce cabinet');
      }

      const [chart] = await sequelize.query(
        'SELECT id, teeth_records FROM dental_charts WHERE patient_id = $1 AND clinic_id = $2 LIMIT 1 FOR UPDATE',
        {
          bind: [req.params.patientId, req.clinic_id],
          type: 'SELECT',
          transaction
        }
      );

      const records = readTeethRecords(chart);
      const index = records.findIndex(tooth =>
        String(tooth.tooth_position) ===
        String(req.params.toothPosition)
      );

      if (index < 0) {
        throw fail(409, 'Dent introuvable dans la fiche existante');
      }

      const previous = records[index].procedures;
      if (!Array.isArray(previous)) {
        throw fail(409, 'Procédures existantes illisibles');
      }

      // Le client doit transmettre l'ancienne liste exacte + 1 procédure.
      const unchangedPrefix =
        incoming.length === previous.length + 1 &&
        previous.every((procedure, i) =>
          isDeepStrictEqual(procedure, incoming[i])
        );

      if (!unchangedPrefix) {
        throw fail(
          409,
          'Conflit : le dossier a changé. Rechargez avant un nouvel ajout.'
        );
      }

      const updatedTooth = {
        ...records[index],
        procedures: [...previous, newProcedure]
      };

      const updatedRecords = records.slice();
      updatedRecords[index] = updatedTooth;

      if (chart) {
        await sequelize.query(
          'UPDATE dental_charts SET teeth_records = $1, updated_at = NOW() WHERE id = $2 AND patient_id = $3 AND clinic_id = $4',
          {
            bind: [
              JSON.stringify(updatedRecords),
              chart.id,
              req.params.patientId,
              req.clinic_id
            ],
            transaction
          }
        );
      } else {
        await sequelize.query(
          `INSERT INTO dental_charts
           (id, patient_id, clinic_id, teeth_records, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, NOW(), NOW())`,
          {
            bind: [
              req.params.patientId,
              req.clinic_id,
              JSON.stringify(updatedRecords)
            ],
            transaction
          }
        );
      }

      return updatedTooth;
    });

    return res.json({
      message: 'Procédure ajoutée',
      tooth: savedTooth
    });
  } catch (error) {
    return respondError(res, error, 'PUT');
  }
});

module.exports = router;
