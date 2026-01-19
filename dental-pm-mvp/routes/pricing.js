const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { PricingSchedule, ProcedureFee, Clinic } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');

const router = express.Router();

// All routes require authentication and valid subscription
router.use(authenticateToken);
router.use(requireValidSubscription);

// Default fees for seeding
const DEFAULT_SYNDICAL_FEES = [
  { procedure_code: 'CONS01', label: 'Consultation simple', price_mga: 15000, category: 'CONSULTATION' },
  { procedure_code: 'CONS02', label: 'Consultation spécialisée', price_mga: 25000, category: 'CONSULTATION' },
  { procedure_code: 'DET01', label: 'Détartrage', price_mga: 30000, category: 'SOINS' },
  { procedure_code: 'OBT01', label: 'Obturation (composite)', price_mga: 40000, category: 'SOINS' },
  { procedure_code: 'OBT02', label: 'Obturation (amalgame)', price_mga: 35000, category: 'SOINS' },
  { procedure_code: 'EXT01', label: 'Extraction simple', price_mga: 25000, category: 'EXTRACTION' },
  { procedure_code: 'EXT02', label: 'Extraction complexe', price_mga: 50000, category: 'EXTRACTION' },
  { procedure_code: 'EXT03', label: 'Extraction dent de sagesse', price_mga: 80000, category: 'EXTRACTION' },
  { procedure_code: 'ENDO01', label: 'Traitement canalaire mono-radiculaire', price_mga: 80000, category: 'SOINS' },
  { procedure_code: 'ENDO02', label: 'Traitement canalaire multi-radiculaire', price_mga: 120000, category: 'SOINS' },
  { procedure_code: 'PROT01', label: 'Couronne céramique', price_mga: 250000, category: 'PROTHESE' },
  { procedure_code: 'PROT02', label: 'Couronne métallique', price_mga: 150000, category: 'PROTHESE' },
  { procedure_code: 'PROT03', label: 'Bridge 3 éléments', price_mga: 600000, category: 'PROTHESE' },
  { procedure_code: 'PROT04', label: 'Prothèse amovible partielle', price_mga: 350000, category: 'PROTHESE' },
  { procedure_code: 'PROT05', label: 'Prothèse amovible complète', price_mga: 500000, category: 'PROTHESE' },
  { procedure_code: 'RAD01', label: 'Radio panoramique', price_mga: 35000, category: 'RADIOLOGIE' },
  { procedure_code: 'RAD02', label: 'Radio rétro-alvéolaire', price_mga: 10000, category: 'RADIOLOGIE' }
];

// Cabinet fees = Syndical * 1.5 (tarifs libres)
const DEFAULT_CABINET_FEES = DEFAULT_SYNDICAL_FEES.map(fee => ({
  ...fee,
  price_mga: Math.round(fee.price_mga * 1.5)
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
router.put('/fees/:id', requireClinicId, [
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
 * Seed default schedules for a clinic
 */
async function seedDefaultSchedules(clinicId) {
  try {
    // Create SYNDICAL schedule
    const syndicalSchedule = await PricingSchedule.create({
      clinic_id: clinicId,
      type: 'SYNDICAL',
      name: 'Tarification Syndicale',
      description: 'Tarifs conventionnés pour patients assurés',
      is_active: true,
      is_default: true
    });

    // Create CABINET schedule
    const cabinetSchedule = await PricingSchedule.create({
      clinic_id: clinicId,
      type: 'CABINET',
      name: 'Tarification Cabinet',
      description: 'Tarifs libres du cabinet',
      is_active: true,
      is_default: false
    });

    // Seed SYNDICAL fees
    for (const fee of DEFAULT_SYNDICAL_FEES) {
      await ProcedureFee.create({
        schedule_id: syndicalSchedule.id,
        ...fee,
        is_active: true
      });
    }

    // Seed CABINET fees
    for (const fee of DEFAULT_CABINET_FEES) {
      await ProcedureFee.create({
        schedule_id: cabinetSchedule.id,
        ...fee,
        is_active: true
      });
    }

    console.log(`Seeded pricing schedules for clinic ${clinicId}`);
    return { syndicalSchedule, cabinetSchedule };
  } catch (error) {
    console.error('Error seeding schedules:', error);
    throw error;
  }
}

module.exports = router;
module.exports.seedDefaultSchedules = seedDefaultSchedules;
