const express = require('express');
const { body, validationResult } = require('express-validator');
const { Clinic, User, Subscription, PricingSchedule, AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const csv = require('csv-parse/sync');

const router = express.Router();

router.use(authenticateToken);

// GET onboarding status
router.get('/status', async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.user.clinic_id);
    if (!clinic) {
      return res.json({ completed: false, step: 1 });
    }

    const subscription = await Subscription.findOne({
      where: { clinic_id: clinic.id }
    });

    const staffCount = await User.count({
      where: { clinic_id: clinic.id, role: { [Op.ne]: 'SUPER_ADMIN' } }
    });

    const tarifCount = await PricingSchedule.count({
      where: { clinic_id: clinic.id, type: 'CABINET' }
    });

    // Determine current step
    let step = 1;
    if (clinic.name && clinic.phone) step = 2;
    if (clinic.logo_url) step = 3;
    if (clinic.mobile_money_merchant) step = 4;
    if (tarifCount > 0) step = 5;
    if (staffCount > 1) step = 6; // completed

    res.json({
      completed: step >= 6,
      step,
      clinic: {
        name: clinic.name,
        logo_url: clinic.logo_url,
        mobile_money_merchant: clinic.mobile_money_merchant
      },
      staff_count: staffCount,
      tarif_count: tarifCount,
      has_subscription: !!subscription,
      subscription_status: subscription?.status
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST step 1: Clinic info
router.post('/step1', [
  body('name').isLength({ min: 2, max: 100 }),
  body('phone').isString(),
  body('address').isString(),
  body('city').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const clinic = await Clinic.findByPk(req.user.clinic_id);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinique non trouvée' });
    }

    const { name, phone, address, city, business_name, nif_number } = req.body;
    await clinic.update({ name, phone, address, city: city || 'Antananarivo', business_name, nif_number });

    res.json({ message: 'Étape 1 complétée', clinic });
  } catch (error) {
    console.error('Onboarding step1 error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST step 2: Logo
router.post('/step2', [
  body('logo_url').isURL()
], async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.user.clinic_id);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinique non trouvée' });
    }

    await clinic.update({ logo_url: req.body.logo_url });
    res.json({ message: 'Étape 2 complétée', logo_url: req.body.logo_url });
  } catch (error) {
    console.error('Onboarding step2 error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST step 3: Mobile Money config
router.post('/step3', [
  body('mobile_money_merchant').optional().isString(),
  body('mobile_money_number').optional().isString()
], async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.user.clinic_id);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinique non trouvée' });
    }

    const { mobile_money_merchant, mobile_money_number } = req.body;
    await clinic.update({ mobile_money_merchant, mobile_money_number });
    res.json({ message: 'Étape 3 complétée' });
  } catch (error) {
    console.error('Onboarding step3 error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST step 4: Import tarif CABINET CSV
router.post('/step4', async (req, res) => {
  try {
    const { csv_data } = req.body;
    if (!csv_data) {
      return res.status(400).json({ error: 'Données CSV requises' });
    }

    const records = csv.parse(csv_data, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    let imported = 0;
    for (const row of records) {
      if (row.code && row.name && row.price_mga) {
        await PricingSchedule.upsert({
          clinic_id: req.user.clinic_id,
          type: 'CABINET',
          code: row.code,
          name: row.name,
          description: row.description || '',
          price_mga: parseFloat(row.price_mga) || 0,
          category: row.category || 'GENERAL',
          is_active: true
        });
        imported++;
      }
    }

    res.json({ message: `${imported} actes importés`, imported });
  } catch (error) {
    console.error('Onboarding step4 error:', error);
    res.status(500).json({ error: 'Erreur import CSV', details: error.message });
  }
});

// POST step 5: Create staff user
router.post('/step5', [
  body('full_name').isLength({ min: 2 }),
  body('username').isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['DENTIST', 'SECRETARY', 'ACCOUNTANT'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { full_name, username, password, role, email } = req.body;

    // Check username exists
    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'Nom d\'utilisateur déjà pris' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      clinic_id: req.user.clinic_id,
      full_name,
      username,
      password: hashedPassword,
      role,
      email,
      is_active: true
    });

    res.status(201).json({ 
      message: 'Utilisateur créé', 
      user: { id: user.id, full_name, username, role } 
    });
  } catch (error) {
    console.error('Onboarding step5 error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST complete onboarding - activate trial
router.post('/complete', async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.user.clinic_id);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinique non trouvée' });
    }

    // Check if subscription exists
    let subscription = await Subscription.findOne({
      where: { clinic_id: clinic.id }
    });

    if (!subscription) {
      // Create 7-day trial subscription
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      subscription = await Subscription.create({
        clinic_id: clinic.id,
        plan: 'PRO',
        status: 'TRIAL',
        start_date: now,
        trial_end_date: trialEnd,
        end_date: trialEnd,
        max_practitioners: 5,
        price_mga: 245000
      });
    }

    // Mark clinic as onboarded
    await clinic.update({ onboarding_completed: true });

    res.json({
      message: 'Onboarding complété! Essai de 7 jours activé.',
      subscription: {
        status: subscription.status,
        trial_end_date: subscription.trial_end_date,
        plan: subscription.plan
      }
    });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
