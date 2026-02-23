const express = require('express');
const { body, validationResult } = require('express-validator');
const { Clinic, Subscription, PaymentRequest, AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

const router = express.Router();

router.use(authenticateToken);

// Subscription price
const MONTHLY_PRICE_MGA = 245000;

// GET billing status
router.get('/status', async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: { clinic_id: req.user.clinic_id },
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      return res.json({
        status: 'NO_SUBSCRIPTION',
        needs_payment: true,
        message: 'Aucun abonnement trouvé'
      });
    }

    const now = new Date();
    const isExpired = subscription.end_date && new Date(subscription.end_date) < now;
    const isTrialExpired = subscription.status === 'TRIAL' && 
      subscription.trial_end_date && new Date(subscription.trial_end_date) < now;

    let daysRemaining = 0;
    if (subscription.end_date) {
      const diffTime = new Date(subscription.end_date).getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    res.json({
      status: subscription.status,
      plan: subscription.plan,
      is_expired: isExpired || isTrialExpired,
      is_trial: subscription.status === 'TRIAL',
      days_remaining: daysRemaining,
      end_date: subscription.end_date,
      trial_end_date: subscription.trial_end_date,
      price_mga: MONTHLY_PRICE_MGA,
      needs_payment: isExpired || isTrialExpired
    });
  } catch (error) {
    console.error('Billing status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST submit payment request (renew)
router.post('/renew', [
  body('payment_method').isIn(['MOBILE_MONEY', 'BANK_TRANSFER', 'CASH']),
  body('months').optional().isInt({ min: 1, max: 12 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { payment_method, months = 1, reference } = req.body;
    const amount = MONTHLY_PRICE_MGA * months;

    // Create payment request
    const paymentRequest = await PaymentRequest.create({
      clinic_id: req.user.clinic_id,
      user_id: req.user.id,
      amount_mga: amount,
      payment_method,
      reference,
      months,
      status: 'PENDING',
      description: `Renouvellement abonnement ${months} mois`
    });

    // Audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'payment_request',
      resource_id: paymentRequest.id,
      new_values: { amount, payment_method, months },
      description: `Demande de paiement: ${amount} Ar`
    });

    res.status(201).json({
      message: 'Demande de paiement soumise. En attente de validation admin.',
      payment_request: {
        id: paymentRequest.id,
        amount_mga: amount,
        status: 'PENDING',
        months
      }
    });
  } catch (error) {
    console.error('Renew error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET pending payment requests
router.get('/payments', async (req, res) => {
  try {
    const payments = await PaymentRequest.findAll({
      where: { clinic_id: req.user.clinic_id },
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET subscription invoice PDF
router.get('/invoice/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const clinic = await Clinic.findByPk(req.user.clinic_id);
    
    if (!clinic) {
      return res.status(404).json({ error: 'Clinique non trouvée' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=facture-abonnement-${year}-${month}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('FACTURE ABONNEMENT', { align: 'center' });
    doc.moveDown();

    // Invoice number
    const invoiceNum = `ABO-${year}-${String(month).padStart(2, '0')}`;
    doc.fontSize(12).font('Helvetica').text(`N° Facture: ${invoiceNum}`, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown(2);

    // Clinic info
    doc.font('Helvetica-Bold').text('FACTURÉ À:');
    doc.font('Helvetica').text(clinic.name);
    doc.text(clinic.address || 'Adresse non renseignée');
    doc.text(`${clinic.city || 'Antananarivo'}, Madagascar`);
    if (clinic.nif_number) doc.text(`NIF: ${clinic.nif_number}`);
    doc.moveDown(2);

    // Table header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop, { width: 300 });
    doc.text('Montant', 400, tableTop, { width: 100, align: 'right' });
    
    // Line
    doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();
    
    // Item
    doc.font('Helvetica');
    const itemY = tableTop + 30;
    doc.text(`Abonnement DentalPM PRO - ${getMonthName(month)} ${year}`, 50, itemY, { width: 300 });
    doc.text(`${formatMoney(MONTHLY_PRICE_MGA)} Ar`, 400, itemY, { width: 100, align: 'right' });

    // Total line
    doc.moveTo(50, itemY + 30).lineTo(550, itemY + 30).stroke();
    
    // Total
    doc.font('Helvetica-Bold').fontSize(14);
    doc.text('TOTAL:', 300, itemY + 45, { width: 100 });
    doc.text(`${formatMoney(MONTHLY_PRICE_MGA)} Ar`, 400, itemY + 45, { width: 100, align: 'right' });

    doc.moveDown(4);

    // Payment info
    doc.fontSize(10).font('Helvetica');
    doc.text('Modalités de paiement:', 50);
    doc.text('• Mobile Money: MVola / Orange Money / Airtel Money');
    doc.text('• Virement bancaire: BNI Madagascar - RIB sur demande');
    doc.text('• Espèces: À nos bureaux');
    
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#666');
    doc.text('Dental Practice Management Madagascar - Solution SaaS de gestion de cabinet dentaire', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ error: 'Erreur génération facture' });
  }
});

function formatMoney(val) {
  return new Intl.NumberFormat('fr-MG').format(val || 0);
}

function getMonthName(month) {
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return months[parseInt(month) - 1] || '';
}

module.exports = router;
