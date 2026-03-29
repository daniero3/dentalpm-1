const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { PricingSchedule, ProcedureFee, Clinic } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parse/sync');
const { Op } = require('sequelize');

const router = express.Router();

// ✅ Helpers
const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || 
        file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Format non autorisé. Utilisez CSV ou JSON.'));
    }
  }
});

// Load data files
let SYNDICAL_2026_FEES = [], CABINET_TEMPLATE_MAEVA_2026 = [];
try { ({ SYNDICAL_2026_FEES } = require('../data/syndical_2026')); } catch(e) { console.warn('syndical_2026 data missing'); }
try { ({ CABINET_TEMPLATE_MAEVA_2026 } = require('../data/cabinet_template_maeva_2026')); } catch(e) { console.warn('cabinet_template_maeva_2026 data missing'); }

const DEFAULT_CABINET_FEES = SYNDICAL_2026_FEES.map(fee => ({
  ...fee, price_mga: Math.round(fee.price_mga * 1.3)
}));

// ── GET /api/pricing-schedules ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const clinicId = getClinicId(req);

    let whereClause = { is_active: true };
    if (clinicId) {
      whereClause[Op.or] = [
        { clinic_id: clinicId },
        { clinic_id: null, type: 'SYNDICAL' }
      ];
    }

    let schedules = await PricingSchedule.findAll({
      where: whereClause,
      include: [{ model: ProcedureFee, as: 'fees', where: { is_active: true }, required: false }],
      order: [['type', 'ASC']]
    });

    if (schedules.length === 0 && clinicId) {
      await seedDefaultSchedules(clinicId);
      schedules = await PricingSchedule.findAll({
        where: { clinic_id: clinicId, is_active: true },
        include: [{ model: ProcedureFee, as: 'fees', where: { is_active: true }, required: false }],
        order: [['type', 'ASC']]
      });
    }

    res.json({ schedules, count: schedules.length });
  } catch (error) {
    console.error('Get pricing schedules error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── GET /api/pricing-schedules/:id ───────────────────────────────────────────
router.get('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const whereOr  = clinicId
      ? { [Op.or]: [{ clinic_id: clinicId }, { clinic_id: null, type: 'SYNDICAL' }] }
      : {};

    const schedule = await PricingSchedule.findOne({
      where: { id: req.params.id, ...whereOr },
      include: [{ model: ProcedureFee, as: 'fees', where: { is_active: true }, required: false }]
    });

    if (!schedule) return res.status(404).json({ error: 'Grille tarifaire non trouvée' });
    res.json({ schedule });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── GET /api/pricing-schedules/:id/fees ──────────────────────────────────────
router.get('/:id/fees', [param('id').isUUID()], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const whereOr  = clinicId
      ? { [Op.or]: [{ clinic_id: clinicId }, { clinic_id: null, type: 'SYNDICAL' }] }
      : {};

    const schedule = await PricingSchedule.findOne({ where: { id: req.params.id, ...whereOr } });
    if (!schedule) return res.status(404).json({ error: 'Grille tarifaire non trouvée' });

    const whereClause = { schedule_id: req.params.id, is_active: true };
    if (req.query.category) whereClause.category = req.query.category;

    const fees = await ProcedureFee.findAll({
      where: whereClause,
      order: [['category','ASC'],['procedure_code','ASC']]
    });

    const by_category = {};
    fees.forEach(f => {
      if (!by_category[f.category]) by_category[f.category] = [];
      by_category[f.category].push(f);
    });

    res.json({ schedule_id: schedule.id, schedule_type: schedule.type, schedule_name: schedule.name, fees, by_category, total_count: fees.length });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ── POST /api/pricing-schedules/:id/fees ─────────────────────────────────────
router.post('/:id/fees', [
  param('id').isUUID(),
  body('procedure_code').notEmpty().isLength({ min:1, max:20 }),
  body('label').notEmpty().isLength({ min:1, max:200 }),
  body('price_mga').isFloat({ min:0 }),
  body('category').optional().isLength({ max:50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const whereOr  = clinicId
      ? { [Op.or]: [{ clinic_id: clinicId }, { clinic_id: null, type:'SYNDICAL' }] }
      : {};

    const schedule = await PricingSchedule.findOne({ where: { id: req.params.id, ...whereOr } });
    if (!schedule) return res.status(404).json({ error:'Grille tarifaire non trouvée' });

    if (schedule.type === 'SYNDICAL' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error:'Non autorisé', message:'SUPER_ADMIN requis pour modifier la grille Syndicale' });
    }

    const { procedure_code, label, price_mga, category = 'GENERAL' } = req.body;
    const existing = await ProcedureFee.findOne({ where: { schedule_id: schedule.id, procedure_code } });
    if (existing) return res.status(409).json({ error:`Code ${procedure_code} déjà existant` });

    const fee = await ProcedureFee.create({ schedule_id: schedule.id, procedure_code, label, price_mga, category, is_active: true });
    res.status(201).json({ message:'Acte ajouté', fee });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── PUT /api/procedure-fees/:id ───────────────────────────────────────────────
router.put('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const fee = await ProcedureFee.findOne({
      where: { id: req.params.id },
      include: [{ model: PricingSchedule, as: 'schedule', required: false }]
    });
    if (!fee) return res.status(404).json({ error:'Acte non trouvé' });

    if (fee.schedule?.type === 'SYNDICAL' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error:'Non autorisé' });
    }

    const { label, price_mga, category, is_active } = req.body;
    await fee.update({
      ...(label     !== undefined && { label }),
      ...(price_mga !== undefined && { price_mga }),
      ...(category  !== undefined && { category }),
      ...(is_active !== undefined && { is_active })
    });
    res.json({ message:'Acte mis à jour', fee });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── POST /:id/import-fees ────────────────────────────────────────────────────
router.post('/:id/import-fees', upload.single('file'), [param('id').isUUID()], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const whereOr  = clinicId ? { [Op.or]: [{ clinic_id: clinicId }, { clinic_id: null, type:'SYNDICAL' }] } : {};
    const schedule = await PricingSchedule.findOne({ where: { id: req.params.id, ...whereOr } });
    if (!schedule) return res.status(404).json({ error:'Grille non trouvée' });
    if (schedule.type === 'SYNDICAL' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error:'Non autorisé' });
    }
    if (!req.file) return res.status(400).json({ error:'Fichier requis' });

    const replaceMode = req.body.replace === 'true';
    const fileContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    let feesData = [];
    if (req.file.originalname.endsWith('.json')) {
      feesData = JSON.parse(fileContent);
    } else {
      feesData = csv.parse(fileContent, { columns:true, skip_empty_lines:true, trim:true, bom:true });
    }

    let inserted = 0, updated = 0;
    const importedCodes = new Set();

    for (const row of feesData) {
      const code  = (row.procedure_code || row.code || row.famille || '').trim();
      const label = (row.label || row.acte || row.description || '').trim();
      const price = parseFloat(row.price_mga || row.tarif_mga || row.price || 0);
      const cat   = row.category || row.section || 'GENERAL';

      if (!code || !label || isNaN(price) || price <= 0) continue;
      importedCodes.add(code);

      const existing = await ProcedureFee.findOne({ where: { schedule_id: schedule.id, procedure_code: code } });
      if (existing) {
        await existing.update({ label, price_mga: Math.round(price), category: cat, is_active: true });
        updated++;
      } else {
        await ProcedureFee.create({ schedule_id: schedule.id, procedure_code: code, label, price_mga: Math.round(price), category: cat, is_active: true });
        inserted++;
      }
    }

    res.json({ message:'Import terminé', inserted, updated, total: inserted + updated });
  } catch (error) {
    res.status(500).json({ error:'Erreur import', details: error.message });
  }
});

// ── GET /:id/export-fees ──────────────────────────────────────────────────────
router.get('/:id/export-fees', [param('id').isUUID()], async (req, res) => {
  try {
    const schedule = await PricingSchedule.findByPk(req.params.id);
    if (!schedule) return res.status(404).json({ error:'Grille non trouvée' });

    const fees = await ProcedureFee.findAll({ where: { schedule_id: schedule.id }, order: [['category','ASC'],['procedure_code','ASC']] });
    const csv  = 'code,acte,tarif_mga,category\n' + fees.map(f => `"${f.procedure_code}","${f.label.replace(/"/g,'""')}",${f.price_mga},"${f.category||'GENERAL'}"`).join('\n');

    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',`attachment; filename=tarifs_${schedule.type}_2026.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur' });
  }
});

// ── DELETE /cleanup-syndical ──────────────────────────────────────────────────
router.delete('/cleanup-syndical', async (req, res) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error:'SUPER_ADMIN requis' });
    const bad = await PricingSchedule.findAll({ where: { type:'SYNDICAL', clinic_id: { [Op.ne]: null } } });
    for (const s of bad) {
      await ProcedureFee.destroy({ where: { schedule_id: s.id } });
      await s.destroy();
    }
    res.json({ message:'Cleanup terminé', deleted_count: bad.length });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── POST /:id/import-template-maeva ──────────────────────────────────────────
router.post('/:id/import-template-maeva', [param('id').isUUID()], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const schedule = await PricingSchedule.findOne({ where: { id: req.params.id, clinic_id: clinicId, type:'CABINET' } });
    if (!schedule) return res.status(404).json({ error:'Grille CABINET non trouvée' });

    await ProcedureFee.update({ is_active: false }, { where: { schedule_id: schedule.id } });
    let inserted = 0, updated = 0;

    for (const fee of CABINET_TEMPLATE_MAEVA_2026) {
      const [rec, created] = await ProcedureFee.findOrCreate({
        where: { schedule_id: schedule.id, procedure_code: fee.procedure_code },
        defaults: { ...fee, is_active: true }
      });
      if (!created) { await rec.update({ ...fee, is_active: true }); updated++; } else inserted++;
    }

    res.json({ message:'Template MAEVA importé', stats: { inserted, updated, total: CABINET_TEMPLATE_MAEVA_2026.length } });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getOrCreateGlobalSyndical() {
  let syndical = await PricingSchedule.findOne({ where: { type:'SYNDICAL', clinic_id: null, is_active: true } });
  if (!syndical) {
    syndical = await PricingSchedule.create({ clinic_id: null, type:'SYNDICAL', name:'Tarification Syndicale 2026', is_active: true, is_default: true, year: 2026, version_code:'SYNDICAL_2026' });
    for (const fee of SYNDICAL_2026_FEES) {
      await ProcedureFee.create({ schedule_id: syndical.id, ...fee, is_active: true });
    }
  }
  return syndical;
}

async function seedDefaultSchedules(clinicId) {
  await getOrCreateGlobalSyndical();
  const cabinet = await PricingSchedule.create({ clinic_id: clinicId, type:'CABINET', name:'Tarification Cabinet', is_active: true, is_default: false, year: 2026, version_code:'CABINET_2026' });
  for (const fee of DEFAULT_CABINET_FEES) {
    await ProcedureFee.create({ schedule_id: cabinet.id, ...fee, is_active: true });
  }
  return cabinet;
}

module.exports = router;
