const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { PricingSchedule, ProcedureFee, Clinic } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');
const multer = require('multer');
const csv = require('csv-parse/sync');

const router = express.Router();

// Multer for CSV upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }, // 1MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Format non autorisé. Utilisez CSV ou JSON.'));
    }
  }
});

// All routes require authentication and valid subscription
router.use(authenticateToken);
router.use(requireValidSubscription);

// Load SYNDICAL 2026 official fees
const { SYNDICAL_2026_FEES } = require('../data/syndical_2026');

// Load CABINET template MAEVA 2026
const { CABINET_TEMPLATE_MAEVA_2026 } = require('../data/cabinet_template_maeva_2026');

// Cabinet fees = Syndical * 1.3 (tarifs libres - majoration 30%)
const DEFAULT_CABINET_FEES = SYNDICAL_2026_FEES.map(fee => ({
  ...fee,
  price_mga: Math.round(fee.price_mga * 1.3)
}));

/**
 * @route GET /api/pricing-schedules
 * @desc Get all pricing schedules for clinic (+ global SYNDICAL)
 * @access Authenticated
 */
router.get('/', requireClinicId, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    
    // Get clinic-specific schedules + global SYNDICAL (clinic_id NULL)
    let schedules = await PricingSchedule.findAll({
      where: { 
        [Op.or]: [
          { clinic_id: req.clinic_id },
          { clinic_id: null, type: 'SYNDICAL' }  // Global SYNDICAL
        ],
        is_active: true 
      },
      include: [{
        model: ProcedureFee,
        as: 'fees',
        where: { is_active: true },
        required: false
      }],
      order: [['type', 'ASC']]
    });

    // Auto-create default schedules if none exist
    if (schedules.length === 0) {
      await seedDefaultSchedules(req.clinic_id);
      schedules = await PricingSchedule.findAll({
        where: { clinic_id: req.clinic_id, is_active: true },
        include: [{
          model: ProcedureFee,
          as: 'fees',
          where: { is_active: true },
          required: false
        }],
        order: [['type', 'ASC']]
      });
    }

    res.json({
      schedules,
      count: schedules.length
    });
  } catch (error) {
    console.error('Get pricing schedules error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * @route DELETE /api/pricing-schedules/cleanup-syndical
 * @desc Delete all SYNDICAL schedules with clinic_id != NULL (SUPER_ADMIN only)
 * @access SUPER_ADMIN
 */
router.delete('/cleanup-syndical', requireClinicId, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Non autorisé', message: 'SUPER_ADMIN requis' });
    }

    const { Op } = require('sequelize');
    
    // Find all SYNDICAL with clinic_id != NULL
    const badSchedules = await PricingSchedule.findAll({
      where: { type: 'SYNDICAL', clinic_id: { [Op.ne]: null } }
    });

    const deletedIds = [];
    for (const schedule of badSchedules) {
      // Delete associated fees first
      await ProcedureFee.destroy({ where: { schedule_id: schedule.id } });
      deletedIds.push(schedule.id);
      await schedule.destroy();
    }

    // Ensure global SYNDICAL exists
    const globalSyndical = await getOrCreateGlobalSyndical();

    res.json({
      message: 'Cleanup terminé',
      deleted_count: deletedIds.length,
      deleted_ids: deletedIds,
      global_syndical_id: globalSyndical.id
    });
  } catch (error) {
    console.error('Cleanup SYNDICAL error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * @route GET /api/pricing-schedules/:id
 * @desc Get single pricing schedule with fees
 * @access Authenticated
 */
router.get('/:id', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { Op } = require('sequelize');
    
    // Allow access to clinic schedules + global SYNDICAL
    const schedule = await PricingSchedule.findOne({
      where: { 
        id: req.params.id,
        [Op.or]: [
          { clinic_id: req.clinic_id },
          { clinic_id: null, type: 'SYNDICAL' }
        ]
      },
      include: [{
        model: ProcedureFee,
        as: 'fees',
        where: { is_active: true },
        required: false,
        order: [['category', 'ASC'], ['procedure_code', 'ASC']]
      }]
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Grille tarifaire non trouvée' });
    }

    res.json({ schedule });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * @route GET /api/pricing-schedules/:id/fees
 * @desc Get fees for a pricing schedule
 * @access Authenticated
 */
router.get('/:id/fees', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { Op } = require('sequelize');
    
    // Allow access to clinic schedules + global SYNDICAL
    const schedule = await PricingSchedule.findOne({
      where: { 
        id: req.params.id,
        [Op.or]: [
          { clinic_id: req.clinic_id },
          { clinic_id: null, type: 'SYNDICAL' }
        ]
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Grille tarifaire non trouvée' });
    }

    const { category } = req.query;
    const whereClause = { schedule_id: req.params.id, is_active: true };
    if (category) whereClause.category = category;

    const fees = await ProcedureFee.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['procedure_code', 'ASC']]
    });

    // Group by category
    const categories = {};
    fees.forEach(fee => {
      if (!categories[fee.category]) {
        categories[fee.category] = [];
      }
      categories[fee.category].push(fee);
    });

    res.json({
      schedule_id: schedule.id,
      schedule_type: schedule.type,
      schedule_name: schedule.name,
      clinic_id: schedule.clinic_id,  // NULL for global SYNDICAL
      fees,
      by_category: categories,
      total_count: fees.length
    });
  } catch (error) {
    console.error('Get fees error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * @route POST /api/pricing-schedules/:id/fees
 * @desc Add fee to pricing schedule (SYNDICAL: SUPER_ADMIN only)
 * @access Authenticated
 */
router.post('/:id/fees', requireClinicId, [
  param('id').isUUID(),
  body('procedure_code').notEmpty().isLength({ min: 1, max: 20 }),
  body('label').notEmpty().isLength({ min: 1, max: 200 }),
  body('price_mga').isFloat({ min: 0 }),
  body('category').optional().isLength({ max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { Op } = require('sequelize');
    
    // Find schedule (clinic-specific or global SYNDICAL)
    const schedule = await PricingSchedule.findOne({
      where: { 
        id: req.params.id,
        [Op.or]: [
          { clinic_id: req.clinic_id },
          { clinic_id: null, type: 'SYNDICAL' }
        ]
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Grille tarifaire non trouvée' });
    }

    // SYNDICAL: SUPER_ADMIN only
    if (schedule.type === 'SYNDICAL' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ 
        error: 'Non autorisé', 
        message: 'Seul un super-administrateur peut modifier la grille Syndicale'
      });
    }

    const { procedure_code, label, price_mga, category = 'GENERAL' } = req.body;

    // Check for duplicate
    const existing = await ProcedureFee.findOne({
      where: { schedule_id: schedule.id, procedure_code }
    });

    if (existing) {
      return res.status(409).json({ 
        error: 'Code acte déjà existant', 
        message: `Le code ${procedure_code} existe déjà dans cette grille`
      });
    }

    const fee = await ProcedureFee.create({
      schedule_id: schedule.id,
      procedure_code,
      label,
      price_mga,
      category,
      is_active: true
    });

    res.status(201).json({
      message: 'Acte ajouté avec succès',
      fee
    });
  } catch (error) {
    console.error('Create fee error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * @route PUT /api/procedure-fees/:id
 * @desc Update procedure fee
 * @access Authenticated (SYNDICAL: SUPER_ADMIN only)
 */
router.put('/:id', requireClinicId, [
  param('id').isUUID(),
  body('label').optional().isLength({ min: 1, max: 200 }),
  body('price_mga').optional().isFloat({ min: 0 }),
  body('category').optional().isLength({ max: 50 }),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { Op } = require('sequelize');
    
    const fee = await ProcedureFee.findOne({
      where: { id: req.params.id },
      include: [{
        model: PricingSchedule,
        as: 'schedule',
        where: { 
          [Op.or]: [
            { clinic_id: req.clinic_id },
            { clinic_id: null }  // Global SYNDICAL
          ]
        }
      }]
    });

    if (!fee) {
      return res.status(404).json({ error: 'Acte non trouvé' });
    }

    // Block SYNDICAL edit except SUPER_ADMIN
    if (fee.schedule.type === 'SYNDICAL' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ 
        error: 'Non autorisé', 
        message: 'Seul un super-administrateur peut modifier la grille Syndicale'
      });
    }

    const { label, price_mga, category, is_active } = req.body;

    await fee.update({
      ...(label !== undefined && { label }),
      ...(price_mga !== undefined && { price_mga }),
      ...(category !== undefined && { category }),
      ...(is_active !== undefined && { is_active })
    });

    res.json({
      message: 'Acte mis à jour',
      fee
    });
  } catch (error) {
    console.error('Update fee error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * @route POST /api/pricing-schedules/:id/import-fees
 * @desc Import fees from CSV/JSON file (SYNDICAL: SUPER_ADMIN only)
 * @access Clinic Admin (CABINET) or Super Admin (SYNDICAL)
 */
router.post('/:id/import-fees', requireClinicId, upload.single('file'), [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { Op } = require('sequelize');
    
    // Find schedule (clinic-specific or global SYNDICAL)
    const schedule = await PricingSchedule.findOne({
      where: { 
        id: req.params.id,
        [Op.or]: [
          { clinic_id: req.clinic_id },
          { clinic_id: null, type: 'SYNDICAL' }
        ]
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Grille tarifaire non trouvée' });
    }

    // SYNDICAL: SUPER_ADMIN only
    if (schedule.type === 'SYNDICAL' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ 
        error: 'Non autorisé', 
        message: 'Seul un super-administrateur peut modifier la grille Syndicale' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Fichier requis' });
    }

    const replaceMode = req.body.replace === 'true' || req.body.replace === true;
    
    let feesData = [];
    // Remove BOM and parse
    const fileContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');

    // Parse CSV or JSON
    if (req.file.originalname.endsWith('.json') || req.file.mimetype === 'application/json') {
      feesData = JSON.parse(fileContent);
    } else {
      // CSV parsing
      feesData = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true
      });
    }

    // Validate and normalize data
    const validFees = [];
    const errors = [];
    const importedCodes = new Set();
    
    for (let i = 0; i < feesData.length; i++) {
      const row = feesData[i];
      
      // Support multiple column formats
      // Format 1: procedure_code, label, price_mga
      // Format 2: code, acte, tarif_mga (CSV from user)
      // Format 3: famille (code court), code (code complet comme PA100), acte (description), tarif_mga
      let code = row.procedure_code || row.code || row.famille;
      let label = row.label || row.description || row.acte;
      let price = parseFloat(row.price_mga || row.tarif_mga || row.price || row.coefficient);
      let category = row.category || row.section || 'GENERAL';
      
      // If 'code' column contains full code like PA100, use it
      if (row.code && /^[A-Za-z]+\d+/.test(row.code)) {
        code = row.code;
      }
      // If 'famille' is the code and there's no numeric suffix, keep as is
      else if (row.famille && !row.code?.match(/\d/)) {
        code = row.famille;
      }

      // Normalize: remove double spaces, trim
      if (code) code = code.trim().replace(/\s+/g, ' ');
      if (label) label = label.trim().replace(/\s+/g, ' ');
      
      // Determine category from section or famille
      if (row.famille) {
        const fam = row.famille.toUpperCase();
        if (fam.startsWith('SC')) category = 'SOINS_CONSERVATEURS';
        else if (fam.startsWith('TC')) category = 'EXTRACTION';
        else if (fam.startsWith('TP')) category = 'PARODONTOLOGIE';
        else if (fam.startsWith('PC')) category = 'PROTHESE_CONJOINTE';
        else if (fam.startsWith('PA')) category = 'PROTHESE_ADJOINTE';
        else if (fam.startsWith('TO')) category = 'ORTHODONTIE';
        else if (fam.startsWith('Ti')) category = 'IMPLANTOLOGIE';
        else if (fam === 'X' || fam.startsWith('X')) category = 'RADIOLOGIE';
        else if (fam === 'C' || fam === 'Cs' || fam === 'EXP' || fam === 'V' || fam === 'Vs' || fam === 'IFD' || fam === 'MNFD') category = 'CONSULTATION';
      }

      if (!code || !label || isNaN(price) || price <= 0) {
        errors.push(`Ligne ${i + 2}: données invalides (code=${code}, price=${price})`);
        continue;
      }

      validFees.push({
        procedure_code: code,
        label: label,
        price_mga: Math.round(price),
        category: category
      });
      importedCodes.add(code);
    }

    if (validFees.length === 0) {
      return res.status(400).json({ 
        error: 'Aucune donnée valide',
        details: errors.slice(0, 10)
      });
    }

    // Import fees (upsert)
    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    for (const fee of validFees) {
      const existing = await ProcedureFee.findOne({
        where: { schedule_id: schedule.id, procedure_code: fee.procedure_code }
      });

      if (existing) {
        await existing.update({
          label: fee.label,
          price_mga: fee.price_mga,
          category: fee.category,
          is_active: true
        });
        updated++;
      } else {
        await ProcedureFee.create({
          schedule_id: schedule.id,
          ...fee,
          is_active: true
        });
        inserted++;
      }
    }

    // Replace mode: deactivate fees not in import
    const deactivated = [];
    if (replaceMode) {
      const allFees = await ProcedureFee.findAll({
        where: { schedule_id: schedule.id, is_active: true }
      });
      
      for (const fee of allFees) {
        if (!importedCodes.has(fee.procedure_code)) {
          await fee.update({ is_active: false });
          deactivated.push({ code: fee.procedure_code, label: fee.label, reason: 'not_in_import' });
        }
      }
    }

    // Build ignored examples from errors
    const ignored = errors.map(err => ({ line: err, reason: 'invalid_data' }));

    res.json({
      message: 'Import terminé',
      inserted,
      updated,
      deleted: deactivated.length,
      total: inserted + updated,
      ignored_count: ignored.length,
      ignored_examples: ignored.slice(0, 10),
      deactivated_count: deactivated.length,
      deactivated_examples: deactivated.slice(0, 10)
    });
  } catch (error) {
    console.error('Import fees error:', error);
    res.status(500).json({ error: 'Erreur import', details: error.message });
  }
});

/**
 * Get or create the global SYNDICAL schedule (clinic_id: NULL)
 */
async function getOrCreateGlobalSyndical() {
  try {
    // Find existing global SYNDICAL
    let syndical = await PricingSchedule.findOne({
      where: { type: 'SYNDICAL', clinic_id: null, year: 2026, is_active: true }
    });

    if (!syndical) {
      // Create global SYNDICAL (clinic_id: NULL)
      syndical = await PricingSchedule.create({
        clinic_id: null,  // GLOBAL
        type: 'SYNDICAL',
        name: 'Tarification Syndicale 2026',
        description: 'Tarifs conventionnés - Nomenclature officielle Madagascar 2026',
        is_active: true,
        is_default: true,
        year: 2026,
        version_code: 'SYNDICAL_2026'
      });

      // Seed SYNDICAL fees from official 2026 data
      for (const fee of SYNDICAL_2026_FEES) {
        await ProcedureFee.create({
          schedule_id: syndical.id,
          ...fee,
          is_active: true
        });
      }
      console.log(`Created global SYNDICAL schedule with ${SYNDICAL_2026_FEES.length} fees`);
    }
    return syndical;
  } catch (error) {
    console.error('Error creating global SYNDICAL:', error);
    throw error;
  }
}

/**
 * Seed default schedules for a clinic (CABINET only, SYNDICAL is global)
 */
async function seedDefaultSchedules(clinicId) {
  try {
    // Ensure global SYNDICAL exists
    await getOrCreateGlobalSyndical();

    // Create CABINET schedule for this clinic
    const cabinetSchedule = await PricingSchedule.create({
      clinic_id: clinicId,
      type: 'CABINET',
      name: 'Tarification Cabinet',
      description: 'Tarifs libres du cabinet (+30% base syndicale)',
      is_active: true,
      is_default: false,
      year: 2026,
      version_code: 'CABINET_2026'
    });

    // Seed CABINET fees (+30%)
    for (const fee of DEFAULT_CABINET_FEES) {
      await ProcedureFee.create({
        schedule_id: cabinetSchedule.id,
        ...fee,
        is_active: true
      });
    }

    console.log(`Seeded CABINET schedule for clinic ${clinicId} (${DEFAULT_CABINET_FEES.length} fees)`);
    return { cabinetSchedule };
  } catch (error) {
    console.error('Error seeding schedules:', error);
    throw error;
  }
}

/**
 * @route GET /api/pricing-schedules/:id/export-fees
 * @desc Export fees as CSV
 */
router.get('/:id/export-fees', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { Op } = require('sequelize');
    
    const schedule = await PricingSchedule.findOne({
      where: { 
        id: req.params.id,
        [Op.or]: [
          { clinic_id: req.clinic_id },
          { clinic_id: null, type: 'SYNDICAL' }
        ]
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Grille tarifaire non trouvée' });
    }

    const fees = await ProcedureFee.findAll({
      where: { schedule_id: schedule.id },
      order: [['category', 'ASC'], ['procedure_code', 'ASC']]
    });

    // Generate CSV
    const csvHeader = 'code,acte,tarif_mga,category,active\n';
    const csvRows = fees.map(fee => 
      `"${fee.procedure_code}","${fee.label.replace(/"/g, '""')}",${fee.price_mga},"${fee.category || 'GENERAL'}",${fee.is_active ? 1 : 0}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tarifs_${schedule.type}_${schedule.year || 2026}.csv`);
    res.send(csvHeader + csvRows);
  } catch (error) {
    console.error('Export fees error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route POST /api/pricing-schedules/:id/import-template-maeva
 * @desc Import MAEVA template into CABINET schedule (1-click)
 */
router.post('/:id/import-template-maeva', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const schedule = await PricingSchedule.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id, type: 'CABINET' }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Grille CABINET non trouvée' });
    }

    // Replace=true: deactivate all existing fees first
    await ProcedureFee.update(
      { is_active: false },
      { where: { schedule_id: schedule.id } }
    );

    const stats = { inserted: 0, updated: 0, total: CABINET_TEMPLATE_MAEVA_2026.length };

    for (const fee of CABINET_TEMPLATE_MAEVA_2026) {
      const [feeRecord, created] = await ProcedureFee.findOrCreate({
        where: { schedule_id: schedule.id, procedure_code: fee.procedure_code },
        defaults: {
          label: fee.label,
          price_mga: fee.price_mga,
          category: fee.category,
          is_active: true
        }
      });

      if (!created) {
        await feeRecord.update({
          label: fee.label,
          price_mga: fee.price_mga,
          category: fee.category,
          is_active: true
        });
        stats.updated++;
      } else {
        stats.inserted++;
      }
    }

    res.json({
      message: 'Template MAEVA importé avec succès',
      schedule_id: schedule.id,
      stats,
      active_count: stats.inserted + stats.updated
    });
  } catch (error) {
    console.error('Import template MAEVA error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;
