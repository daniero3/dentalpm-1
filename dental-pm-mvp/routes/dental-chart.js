const express = require('express');
const { param, validationResult } = require('express-validator');

const router = express.Router();

// ✅ Helpers clinic_id et user_id — lisent depuis toutes les sources
const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
const getUserId   = (req) => req.user?.id   || req.user?.dataValues?.id || req.user?.userId || null;

// ✅ Subscription verifiee cote frontend

function generateEmptyTeeth() {
  return Array.from({ length: 32 }, (_, i) => ({
    tooth_position: String(i + 1),
    status: 'healthy',
    procedures: [],
    notes: ''
  }));
}

// GET /api/patients/:patientId/dental-chart
router.get('/patients/:patientId/dental-chart', [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides' });

    const { patientId } = req.params;
    const sequelize = require('../database/connection');

    const [patient] = await sequelize.query(
      `SELECT id FROM patients WHERE id = $1 AND clinic_id = $2 LIMIT 1`,
      { bind: [patientId, req.clinic_id], type: 'SELECT' }
    );
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    let [chart] = await sequelize.query(
      `SELECT * FROM dental_charts WHERE patient_id = $1 AND clinic_id = $2 LIMIT 1`,
      { bind: [patientId, req.clinic_id], type: 'SELECT' }
    );

    if (!chart) {
      const teeth = generateEmptyTeeth();
      await sequelize.query(
        `INSERT INTO dental_charts (id, patient_id, clinic_id, teeth_records, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, NOW(), NOW())`,
        { bind: [patientId, req.clinic_id, JSON.stringify(teeth)] }
      );
      [chart] = await sequelize.query(
        `SELECT * FROM dental_charts WHERE patient_id = $1 AND clinic_id = $2 LIMIT 1`,
        { bind: [patientId, req.clinic_id], type: 'SELECT' }
      );
    }

    let teethRecords = chart.teeth_records;
    if (typeof teethRecords === 'string') teethRecords = JSON.parse(teethRecords);
    if (!Array.isArray(teethRecords)) teethRecords = generateEmptyTeeth();

    res.json({ id: chart.id, patient_id: patientId, teeth_records: teethRecords });
  } catch (error) {
    console.error('Get dental chart error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// PUT /api/patients/:patientId/dental-chart/tooth/:toothPosition
router.put('/patients/:patientId/dental-chart/tooth/:toothPosition', async (req, res) => {
  try {
    const { patientId, toothPosition } = req.params;
    const sequelize = require('../database/connection');

    let [chart] = await sequelize.query(
      `SELECT * FROM dental_charts WHERE patient_id = $1 AND clinic_id = $2 LIMIT 1`,
      { bind: [patientId, req.clinic_id], type: 'SELECT' }
    );

    let teethRecords = chart?.teeth_records;
    if (typeof teethRecords === 'string') teethRecords = JSON.parse(teethRecords);
    if (!Array.isArray(teethRecords)) teethRecords = generateEmptyTeeth();

    const idx = teethRecords.findIndex(t => String(t.tooth_position) === String(toothPosition));
    if (idx === -1) return res.status(404).json({ error: 'Dent non trouvée' });

    teethRecords[idx] = {
      ...teethRecords[idx],
      ...req.body,
      tooth_position: String(toothPosition),
      procedures: Array.isArray(req.body.procedures) ? req.body.procedures : (teethRecords[idx].procedures || [])
    };

    if (!chart) {
      await sequelize.query(
        `INSERT INTO dental_charts (id, patient_id, clinic_id, teeth_records, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, NOW(), NOW())`,
        { bind: [patientId, req.clinic_id, JSON.stringify(teethRecords)] }
      );
    } else {
      await sequelize.query(
        `UPDATE dental_charts SET teeth_records = $1, updated_at = NOW()
         WHERE patient_id = $2 AND clinic_id = $3`,
        { bind: [JSON.stringify(teethRecords), patientId, req.clinic_id] }
      );
    }

    res.json({ message: 'Dent mise à jour', tooth: teethRecords[idx] });
  } catch (error) {
    console.error('Update tooth error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;
