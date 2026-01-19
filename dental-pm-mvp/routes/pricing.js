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

// Cabinet fees = Syndical * 1.3 (tarifs libres - majoration 30%)
const DEFAULT_CABINET_FEES = SYNDICAL_2026_FEES.map(fee => ({
  ...fee,
  price_mga: Math.round(fee.price_mga * 1.3)
}));

/**
 * @route GET /api/pricing-schedules
 * @desc Get all pricing schedules for clinic
 * @access Authenticated
 */
router.get('/', requireClinicId, async (req, res) => {
  try {
    let schedules = await PricingSchedule.findAll({
      where: { clinic_id: req.clinic_id, is_active: true },
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
 * @route GET /api/pricing-schedules/:id
 * @desc Get single pricing schedule with fees
 * @access Authenticated
 */
router.get('/:id', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const schedule = await PricingSchedule.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id },
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
    const schedule = await PricingSchedule.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
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
 * @desc Add fee to pricing schedule
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

    const schedule = await PricingSchedule.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Grille tarifaire non trouvée' });
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
 * @access Authenticated
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

    const fee = await ProcedureFee.findOne({
      where: { id: req.params.id },
      include: [{
        model: PricingSchedule,
        as: 'schedule',
        where: { clinic_id: req.clinic_id }
      }]
    });

    if (!fee) {
      return res.status(404).json({ error: 'Acte non trouvé' });
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
 * @desc Import fees from CSV/JSON file (Admin only)
 * @access Clinic Admin or Super Admin
 */
router.post('/:id/import-fees', requireClinicId, upload.single('file'), [
  param('id').isUUID()
], async (req, res) => {
  try {
    const schedule = await PricingSchedule.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Grille tarifaire non trouvée' });
    }

    // Only allow import for SYNDICAL if SUPER_ADMIN, CABINET for clinic ADMIN
    if (schedule.type === 'SYNDICAL' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Non autorisé', 
        message: 'Seul un administrateur peut modifier la grille Syndicale' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Fichier requis' });
    }

    let feesData = [];
    const fileContent = req.file.buffer.toString('utf-8');

    // Parse CSV or JSON
    if (req.file.originalname.endsWith('.json') || req.file.mimetype === 'application/json') {
      feesData = JSON.parse(fileContent);
    } else {
      // CSV parsing
      feesData = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    }

    // Validate data
    const validFees = [];
    const errors = [];
    
    for (let i = 0; i < feesData.length; i++) {
      const row = feesData[i];
      const code = row.procedure_code || row.code;
      const label = row.label || row.description;
      const price = parseFloat(row.price_mga || row.price);
      const category = row.category || 'GENERAL';

      if (!code || !label || isNaN(price) || price <= 0) {
        errors.push(`Ligne ${i + 1}: données invalides`);
        continue;
      }

      validFees.push({
        procedure_code: code.trim(),
        label: label.trim(),
        price_mga: price,
        category: category.trim()
      });
    }

    if (validFees.length === 0) {
      return res.status(400).json({ 
        error: 'Aucune donnée valide',
        details: errors 
      });
    }

    // Import fees (upsert)
    let imported = 0;
    let updated = 0;

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
        imported++;
      }
    }

    res.json({
      message: 'Import terminé',
      imported,
      updated,
      total: imported + updated,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import fees error:', error);
    res.status(500).json({ error: 'Erreur import', details: error.message });
  }
});

/**
 * Seed default schedules for a clinic
 */
async function seedDefaultSchedules(clinicId) {
  try {
    // Create SYNDICAL schedule with year
    const syndicalSchedule = await PricingSchedule.create({
      clinic_id: clinicId,
      type: 'SYNDICAL',
      name: 'Tarification Syndicale 2026',
      description: 'Tarifs conventionnés - Nomenclature officielle Madagascar 2026',
      is_active: true,
      is_default: true,
      year: 2026,
      version_code: 'SYNDICAL_2026'
    });

    // Create CABINET schedule
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

    // Seed SYNDICAL fees from official 2026 data
    for (const fee of SYNDICAL_2026_FEES) {
      await ProcedureFee.create({
        schedule_id: syndicalSchedule.id,
        ...fee,
        is_active: true
      });
    }

    // Seed CABINET fees (+30%)
    for (const fee of DEFAULT_CABINET_FEES) {
      await ProcedureFee.create({
        schedule_id: cabinetSchedule.id,
        ...fee,
        is_active: true
      });
    }

    console.log(`Seeded pricing schedules for clinic ${clinicId} (${SYNDICAL_2026_FEES.length} SYNDICAL + ${DEFAULT_CABINET_FEES.length} CABINET fees)`);
    return { syndicalSchedule, cabinetSchedule };
  } catch (error) {
    console.error('Error seeding schedules:', error);
    throw error;
  }
}

module.exports = router;
