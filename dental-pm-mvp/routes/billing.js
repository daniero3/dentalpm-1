const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { requireRole } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { Clinic, Subscription, SubscriptionInvoice, PaymentRequest, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for receipt uploads
const uploadDir = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé (jpg, png, pdf uniquement)'));
    }
  }
});

// Plan pricing (MGA)
const PLAN_PRICING = {
  ESSENTIAL: 150000,
  PRO: 300000,
  GROUP: 500000
};

/**
 * @route GET /api/billing/dashboard
 * @desc Get billing dashboard statistics
 * @access Super Admin or Clinic Users
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { user } = req;
    
    let whereClause = {};
    if (user.role !== 'SUPER_ADMIN') {
      if (!user.clinic_id) {
        return res.status(403).json({ error: 'Non autorisé' });
      }
      whereClause.clinic_id = user.clinic_id;
    }

    // Get basic billing stats
    const [
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalRevenue
    ] = await Promise.all([
      SubscriptionInvoice.count({ where: whereClause }),
      SubscriptionInvoice.count({ where: { ...whereClause, status: 'PAID' } }),
      SubscriptionInvoice.count({ where: { ...whereClause, status: 'PENDING' } }),
      SubscriptionInvoice.sum('total_mga', { where: { ...whereClause, status: 'PAID' } })
    ]);

    res.json({
      stats: {
        total_invoices: totalInvoices,
        paid_invoices: paidInvoices,
        pending_invoices: pendingInvoices,
        total_revenue_mga: totalRevenue || 0
      }
    });

  } catch (error) {
    console.error('Billing dashboard error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques de facturation'
    });
  }
});

/**
 * @route POST /api/billing/generate-invoice
 * @desc Generate subscription invoice for a clinic
 * @access Super Admin
 */
router.post('/generate-invoice', [
  requireRole('SUPER_ADMIN'),
  body('subscription_id').isUUID().withMessage('Subscription ID invalide'),
  body('billing_period_start').isISO8601().withMessage('Date début invalide'),
  body('billing_period_end').isISO8601().withMessage('Date fin invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { subscription_id, billing_period_start, billing_period_end } = req.body;

    // Find subscription with clinic details
    const subscription = await Subscription.findByPk(subscription_id, {
      include: [
        {
          model: Clinic,
          attributes: ['id', 'name', 'address', 'city', 'nif_number', 'stat_number', 'contact_email']
        }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Abonnement introuvable' });
    }

    // Check if invoice already exists for this period
    const existingInvoice = await SubscriptionInvoice.findOne({
      where: {
        subscription_id,
        billing_period_start: new Date(billing_period_start),
        billing_period_end: new Date(billing_period_end)
      }
    });

    if (existingInvoice) {
      return res.status(400).json({ 
        error: 'Une facture existe déjà pour cette période' 
      });
    }

    // Calculate amount based on billing cycle
    let amount_mga = subscription.monthly_price_mga;
    if (subscription.billing_cycle === 'ANNUAL') {
      amount_mga = subscription.annual_price_mga;
    }

    // Generate invoice number
    const count = await SubscriptionInvoice.count();
    const invoice_number = `SUB-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    // Create subscription invoice
    const invoice = await SubscriptionInvoice.create({
      subscription_id,
      clinic_id: subscription.clinic_id,
      invoice_number,
      billing_period_start: new Date(billing_period_start),
      billing_period_end: new Date(billing_period_end),
      amount_mga,
      discount_amount_mga: 0, // Discount already applied in subscription
      total_mga: amount_mga,
      status: 'PENDING',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      currency: 'MGA',
      payment_method: 'CREDIT_CARD', // Default
      description: `Abonnement ${subscription.plan} - ${subscription.Clinic.name}`
    });

    res.status(201).json({
      message: 'Facture d\'abonnement générée avec succès',
      invoice: {
        ...invoice.toJSON(),
        clinic: subscription.Clinic,
        subscription: {
          plan: subscription.plan,
          billing_cycle: subscription.billing_cycle
        }
      }
    });

  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de la facture'
    });
  }
});

/**
 * @route GET /api/billing/invoices
 * @desc Get subscription invoices
 * @access Super Admin or Clinic Users
 */
router.get('/invoices', async (req, res) => {
  try {
    const { user } = req;
    const { page = 1, limit = 20, status, clinic_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};

    if (user.role === 'SUPER_ADMIN') {
      // Super admin can see all invoices
      if (status) whereClause.status = status;
      if (clinic_id) whereClause.clinic_id = clinic_id;
    } else {
      // Regular users see only their clinic's invoices
      if (!user.clinic_id) {
        return res.status(403).json({ error: 'Non autorisé' });
      }
      whereClause.clinic_id = user.clinic_id;
      if (status) whereClause.status = status;
    }

    const { count, rows: invoices } = await SubscriptionInvoice.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Clinic,
          attributes: ['id', 'name', 'city']
        },
        {
          model: Subscription,
          attributes: ['id', 'plan', 'billing_cycle']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      invoices,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des factures'
    });
  }
});

/**
 * @route GET /api/billing/invoices/:id
 * @desc Get specific subscription invoice
 * @access Super Admin or Clinic Users
 */
router.get('/invoices/:id', [
  param('id').isUUID().withMessage('ID facture invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { user } = req;

    let whereClause = { id };
    
    // Non-super admins can only see their clinic's invoices
    if (user.role !== 'SUPER_ADMIN') {
      if (!user.clinic_id) {
        return res.status(403).json({ error: 'Non autorisé' });
      }
      whereClause.clinic_id = user.clinic_id;
    }

    const invoice = await SubscriptionInvoice.findOne({
      where: whereClause,
      include: [
        {
          model: Clinic,
          attributes: ['id', 'name', 'address', 'city', 'postal_code', 'nif_number', 'stat_number', 'contact_email', 'phone']
        },
        {
          model: Subscription,
          attributes: ['id', 'plan', 'billing_cycle', 'features']
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Facture introuvable' });
    }

    res.json({ invoice });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la facture'
    });
  }
});

/**
 * @route POST /api/billing/invoices/:id/pay
 * @desc Process payment for subscription invoice (Mock)
 * @access Super Admin or Clinic Users
 */
router.post('/invoices/:id/pay', [
  param('id').isUUID().withMessage('ID facture invalide'),
  body('payment_method').isIn(['CREDIT_CARD', 'BANK_TRANSFER', 'MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY']).withMessage('Méthode de paiement invalide'),
  body('payment_reference').optional().isLength({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { payment_method, payment_reference } = req.body;
    const { user } = req;

    let whereClause = { id };
    
    // Non-super admins can only pay their clinic's invoices
    if (user.role !== 'SUPER_ADMIN') {
      if (!user.clinic_id) {
        return res.status(403).json({ error: 'Non autorisé' });
      }
      whereClause.clinic_id = user.clinic_id;
    }

    const invoice = await SubscriptionInvoice.findOne({
      where: whereClause,
      include: [
        {
          model: Subscription,
          attributes: ['id', 'plan']
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Facture introuvable' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ error: 'Cette facture est déjà payée' });
    }

    // Mock payment processing (90% success rate)
    const paymentSuccess = Math.random() > 0.1;

    if (paymentSuccess) {
      // Update invoice as paid
      await invoice.update({
        status: 'PAID',
        paid_at: new Date(),
        payment_method,
        payment_reference: payment_reference || `MOCK-${Date.now()}`,
        transaction_id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      });

      // If subscription was expired due to non-payment, reactivate it
      const subscription = await Subscription.findByPk(invoice.subscription_id);
      if (subscription && subscription.status === 'EXPIRED') {
        await subscription.update({ status: 'ACTIVE' });
      }

      res.json({
        success: true,
        message: 'Paiement traité avec succès',
        invoice: {
          ...invoice.toJSON(),
          status: 'PAID',
          paid_at: new Date(),
          payment_method,
          transaction_id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        }
      });
    } else {
      // Mock payment failure
      await invoice.update({
        status: 'PAYMENT_FAILED',
        payment_attempts: (invoice.payment_attempts || 0) + 1,
        last_payment_attempt: new Date(),
        payment_failure_reason: 'Paiement refusé - Fonds insuffisants (simulation)'
      });

      res.status(400).json({
        success: false,
        error: 'Paiement échoué',
        message: 'Le paiement a été refusé. Veuillez vérifier vos informations de paiement.',
        invoice: {
          ...invoice.toJSON(),
          status: 'PAYMENT_FAILED'
        }
      });
    }

  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      error: 'Erreur lors du traitement du paiement'
    });
  }
});

/**
 * @route GET /api/billing/stats
 * @desc Get billing statistics
 * @access Super Admin
 */
router.get('/stats', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);        
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Get statistics
    const [
      totalRevenue,
      paidInvoices,
      pendingInvoices,
      failedInvoices,
      subscriptionsByPlan,
      recentInvoices
    ] = await Promise.all([
      // Total revenue
      SubscriptionInvoice.sum('total_mga', {
        where: {
          status: 'PAID',
          paid_at: { [Op.gte]: startDate }
        }
      }),
      // Paid invoices count
      SubscriptionInvoice.count({
        where: {
          status: 'PAID',
          paid_at: { [Op.gte]: startDate }  
        }
      }),
      // Pending invoices
      SubscriptionInvoice.count({
        where: { status: 'PENDING' }
      }),
      // Failed payments
      SubscriptionInvoice.count({
        where: { status: 'PAYMENT_FAILED' }
      }),
      // Subscriptions by plan
      Subscription.findAll({
        attributes: [
          'plan',
          [Subscription.sequelize.fn('COUNT', Subscription.sequelize.col('id')), 'count'],
          [Subscription.sequelize.fn('SUM', Subscription.sequelize.col('monthly_price_mga')), 'total_monthly_revenue']
        ],
        where: { status: 'ACTIVE' },
        group: ['plan'],
        raw: true
      }),
      // Recent invoices
      SubscriptionInvoice.findAll({
        include: [
          {
            model: Clinic,
            attributes: ['name']
          }
        ],
        limit: 10,
        order: [['created_at', 'DESC']]
      })
    ]);

    res.json({
      period,
      stats: {
        total_revenue_mga: totalRevenue || 0,
        paid_invoices: paidInvoices,
        pending_invoices: pendingInvoices,
        failed_payments: failedInvoices,
        subscriptions_by_plan: subscriptionsByPlan,
        recent_invoices: recentInvoices
      }
    });

  } catch (error) {
    console.error('Get billing stats error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// =============================================================================
// PAYMENT REQUESTS (Local Payment Proof System)
// =============================================================================

/**
 * @route GET /api/billing/plans
 * @desc Get available plans with pricing
 * @access Authenticated
 */
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      { code: 'ESSENTIAL', name: 'Essentiel', price_mga: PLAN_PRICING.ESSENTIAL, features: ['1 praticien', '100 patients', 'Support email'] },
      { code: 'PRO', name: 'Professionnel', price_mga: PLAN_PRICING.PRO, features: ['3 praticiens', '500 patients', 'Support prioritaire', 'Rapports avancés'] },
      { code: 'GROUP', name: 'Groupe', price_mga: PLAN_PRICING.GROUP, features: ['Praticiens illimités', 'Patients illimités', 'Support dédié', 'Multi-sites'] }
    ],
    payment_methods: [
      { code: 'MVOLA', name: 'MVola', instructions: 'Envoyer au 034 00 000 00' },
      { code: 'ORANGE_MONEY', name: 'Orange Money', instructions: 'Envoyer au 032 00 000 00' },
      { code: 'AIRTEL_MONEY', name: 'Airtel Money', instructions: 'Envoyer au 033 00 000 00' },
      { code: 'BANK_TRANSFER', name: 'Virement bancaire', instructions: 'RIB: 00001 00002 00000000001 00' },
      { code: 'CASH', name: 'Espèces', instructions: 'À nos bureaux' }
    ]
  });
});

/**
 * @route GET /api/billing/subscription
 * @desc Get current clinic subscription status
 * @access Clinic Users
 */
router.get('/subscription', requireClinicId, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: { clinic_id: req.clinic_id },
      include: [{ model: Clinic, as: 'clinic', attributes: ['name'] }],
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      return res.json({
        subscription: null,
        status: 'NO_SUBSCRIPTION',
        message: 'Aucun abonnement actif'
      });
    }

    res.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        monthly_price_mga: subscription.monthly_price_mga,
        clinic_name: subscription.clinic?.name
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'abonnement' });
  }
});

/**
 * @route POST /api/billing/payment-requests
 * @desc Submit payment request with receipt
 * @access Clinic Admin
 */
router.post('/payment-requests', requireClinicId, upload.single('receipt'), [
  body('plan_code').isIn(['ESSENTIAL', 'PRO', 'GROUP']).withMessage('Plan invalide'),
  body('payment_method').isIn(['MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'BANK_TRANSFER', 'CASH']).withMessage('Méthode de paiement invalide'),
  body('reference').notEmpty().withMessage('Référence requise').isLength({ min: 1, max: 100 }).withMessage('Référence: 1-100 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { plan_code, payment_method, reference } = req.body;
    
    // Double-check reference is not empty string
    if (!reference || reference.trim() === '') {
      return res.status(400).json({ error: 'Référence requise', message: 'La référence de paiement ne peut pas être vide' });
    }
    
    const amount_mga = PLAN_PRICING[plan_code];

    // Check for pending request
    const pendingRequest = await PaymentRequest.findOne({
      where: { clinic_id: req.clinic_id, status: 'PENDING' }
    });

    if (pendingRequest) {
      return res.status(400).json({
        error: 'Demande en attente',
        message: 'Une demande de paiement est déjà en cours de validation'
      });
    }

    // Create payment request
    let paymentRequest;
    try {
      paymentRequest = await PaymentRequest.create({
        clinic_id: req.clinic_id,
        plan_code,
        amount_mga,
        payment_method,
        reference: reference || null,
        receipt_url: req.file ? `/uploads/receipts/${req.file.filename}` : null,
        status: 'PENDING',
        submitted_by_user_id: req.user.id
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          error: 'Référence en double',
          message: `Une demande avec la référence "${reference}" existe déjà pour cette clinique`
        });
      }
      throw err;
    }

    res.status(201).json({
      message: 'Demande de paiement soumise',
      paymentRequest: {
        id: paymentRequest.id,
        clinic_id: paymentRequest.clinic_id,
        plan_code: paymentRequest.plan_code,
        amount_mga: paymentRequest.amount_mga,
        payment_method: paymentRequest.payment_method,
        reference: paymentRequest.reference,
        status: paymentRequest.status,
        created_at: paymentRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Create payment request error:', error);
    res.status(500).json({ error: 'Erreur lors de la soumission de la demande' });
  }
});

/**
 * @route GET /api/billing/payment-requests
 * @desc Get clinic payment requests
 * @access Clinic Users
 */
router.get('/payment-requests', requireClinicId, async (req, res) => {
  try {
    const requests = await PaymentRequest.findAll({
      where: { clinic_id: req.clinic_id },
      include: [
        { model: User, as: 'submittedBy', attributes: ['id', 'full_name'] },
        { model: User, as: 'verifiedBy', attributes: ['id', 'full_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ paymentRequests: requests });
  } catch (error) {
    console.error('Get payment requests error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes' });
  }
});

module.exports = router;