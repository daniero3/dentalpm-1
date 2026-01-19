const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Invoice, InvoiceItem, Patient, Payment, Procedure, AuditLog, PricingSchedule, ProcedureFee, Clinic } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { auditLogger } = require('../middleware/auditLogger');
const { requireValidSubscription } = require('../middleware/licensing');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// All routes require valid subscription
router.use(requireValidSubscription);

// Audit logging for write operations
router.use(auditLogger('invoices'));

// Get all invoices - with clinic filtering
router.get('/', requireClinicId, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const { page = 1, limit = 20, status, patient_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    
    // Apply clinic filtering
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }
    
    if (status) whereClause.status = status;
    if (patient_id) whereClause.patient_id = patient_id;
    if (start_date) whereClause.invoice_date = { $gte: start_date };
    if (end_date) {
      whereClause.invoice_date = {
        ...whereClause.invoice_date,
        $lte: end_date
      };
    }

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'phone_primary']
        },
        {
          model: InvoiceItem,
          as: 'items'
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['invoice_date', 'DESC'], ['created_at', 'DESC']]
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

// Get single invoice - with clinic check
router.get('/:id', requireClinicId, [
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

    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          as: 'patient'
        },
        {
          model: InvoiceItem,
          as: 'items',
          include: [
            {
              model: Procedure,
              as: 'procedure'
            }
          ]
        },
        {
          model: Payment,
          as: 'payments',
          order: [['payment_date', 'DESC']]
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        error: 'Facture non trouvée'
      });
    }

    // Log invoice view
    await AuditLog.create({
      user_id: req.user.id,
      action: 'VIEW',
      resource_type: 'invoices',
      resource_id: invoice.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Consultation facture: ${invoice.invoice_number}`
    });

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la facture'
    });
  }
});

// Create new invoice - with automatic clinic_id assignment
router.post('/', requireClinicId, [
  body('patient_id')
    .isUUID()
    .withMessage('ID patient invalide'),
  body('schedule_id')
    .isUUID()
    .withMessage('ID grille tarifaire invalide'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Au moins un article requis'),
  body('items.*.description')
    .isLength({ min: 1, max: 255 })
    .withMessage('Description article requise'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantité invalide'),
  body('items.*.unit_price_mga')
    .isFloat({ min: 0 })
    .withMessage('Prix unitaire invalide'),
  body('discount_percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Pourcentage remise invalide'),
  body('nif_number')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Numéro NIF invalide'),
  body('stat_number')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Numéro STAT invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { patient_id, schedule_id, items, discount_percentage = 0, discount_type, nif_number, stat_number, notes } = req.body;

    // Verify patient exists
    const patient = await Patient.findByPk(patient_id);
    if (!patient) {
      return res.status(404).json({
        error: 'Patient non trouvé'
      });
    }

    // Verify pricing schedule exists and belongs to clinic (or is global SYNDICAL)
    const pricingSchedule = await PricingSchedule.findOne({
      where: { 
        id: schedule_id, 
        is_active: true,
        [Op.or]: [
          { clinic_id: req.clinic_id },
          { clinic_id: null, type: 'SYNDICAL' }  // Global SYNDICAL accessible to all
        ]
      }
    });
    if (!pricingSchedule) {
      return res.status(404).json({
        error: 'Grille tarifaire non trouvée'
      });
    }

    // Generate invoice number before creation
    const currentYear = new Date().getFullYear();
    const invoiceCount = await Invoice.count({
      where: {
        created_at: {
          [Op.gte]: new Date(currentYear, 0, 1),
          [Op.lt]: new Date(currentYear + 1, 0, 1)
        }
      }
    });
    const invoiceNumber = `FACT-${currentYear}-${String(invoiceCount + 1).padStart(4, '0')}`;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price_mga), 0);
    const discountAmount = (subtotal * discount_percentage) / 100;
    const total = subtotal - discountAmount;

    // Create invoice
    const invoice = await Invoice.create({
      invoice_number: invoiceNumber,
      patient_id,
      schedule_id: pricingSchedule.id,
      subtotal_mga: subtotal,
      discount_percentage,
      discount_amount_mga: discountAmount,
      discount_type,
      total_mga: total,
      nif_number,
      stat_number,
      notes,
      clinic_id: req.clinic_id, // Automatic clinic assignment
      created_by_user_id: req.user.id
    });

    // Create invoice items
    const invoiceItems = await Promise.all(
      items.map(item => InvoiceItem.create({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price_mga: item.unit_price_mga,
        total_price_mga: item.quantity * item.unit_price_mga,
        procedure_id: item.procedure_id,
        tooth_number: item.tooth_number,
        notes: item.notes
      }))
    );

    // Log invoice creation
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'invoices',
      resource_id: invoice.id,
      new_values: { patient_id, total_mga: total, items: items.length },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Nouvelle facture créée: ${invoice.invoice_number} (${total} MGA)`
    });

    // Fetch complete invoice with relations
    const completeInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'phone_primary']
        },
        {
          model: InvoiceItem,
          as: 'items'
        }
      ]
    });

    res.status(201).json({
      message: 'Facture créée avec succès',
      invoice: completeInvoice
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la facture'
    });
  }
});

// Update invoice status - with clinic check
router.patch('/:id/status', requireClinicId, [
  param('id').isUUID().withMessage('ID facture invalide'),
  body('status')
    .isIn(['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'])
    .withMessage('Statut invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { status } = req.body;
    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        error: 'Facture non trouvée'
      });
    }

    const oldStatus = invoice.status;
    await invoice.update({
      status,
      sent_at: status === 'SENT' ? new Date() : invoice.sent_at,
      paid_at: status === 'PAID' ? new Date() : invoice.paid_at
    });

    // Log status update
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      resource_type: 'invoices',
      resource_id: invoice.id,
      old_values: { status: oldStatus },
      new_values: { status },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Statut facture modifié: ${invoice.invoice_number} (${oldStatus} → ${status})`
    });

    res.json({
      message: 'Statut de la facture mis à jour',
      invoice
    });
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du statut'
    });
  }
});

// Delete invoice (only drafts) - with clinic check
router.delete('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID facture invalide'),
  requireRole('ADMIN', 'DENTIST', 'ACCOUNTANT')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        error: 'Facture non trouvée'
      });
    }

    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Seules les factures en brouillon peuvent être supprimées'
      });
    }

    // Delete invoice items first
    await InvoiceItem.destroy({
      where: { invoice_id: invoice.id }
    });

    // Delete invoice
    await invoice.destroy();

    // Log deletion
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE',
      resource_type: 'invoices',
      resource_id: invoice.id,
      old_values: invoice.toJSON(),
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Facture supprimée: ${invoice.invoice_number}`
    });

    res.json({
      message: 'Facture supprimée avec succès'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de la facture'
    });
  }
});

// ==========================================
// PAYMENT ROUTES
// ==========================================

/**
 * @route GET /api/invoices/:id/payments
 * @desc Get all payments for an invoice
 */
router.get('/:id/payments', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const payments = await Payment.findAll({
      where: { invoice_id: invoice.id, status: 'COMPLETED' },
      order: [['payment_date', 'DESC']]
    });

    const paid_total_mga = payments.reduce((sum, p) => sum + parseFloat(p.amount_mga || 0), 0);
    const balance_mga = parseFloat(invoice.total_mga) - paid_total_mga;
    const payment_status = balance_mga <= 0 ? 'PAID' : (paid_total_mga > 0 ? 'PARTIAL' : 'UNPAID');

    res.json({
      invoice_id: invoice.id,
      total_mga: parseFloat(invoice.total_mga),
      paid_total_mga,
      balance_mga,
      payment_status,
      payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route POST /api/invoices/:id/payments
 * @desc Create a new payment for an invoice
 */
router.post('/:id/payments', requireClinicId, [
  param('id').isUUID(),
  body('amount_mga').isFloat({ min: 1 }).withMessage('Montant invalide'),
  body('payment_method').isIn(['CASH', 'CHEQUE', 'CARD', 'MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'BANK_TRANSFER']).withMessage('Méthode invalide'),
  body('reference_number').optional().isString(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const invoice = await Invoice.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Calculate current paid total
    const existingPayments = await Payment.findAll({
      where: { invoice_id: invoice.id, status: 'COMPLETED' }
    });
    const currentPaid = existingPayments.reduce((sum, p) => sum + parseFloat(p.amount_mga || 0), 0);
    const balance = parseFloat(invoice.total_mga) - currentPaid;

    const { amount_mga, payment_method, reference_number, notes } = req.body;

    // Check overpayment
    if (parseFloat(amount_mga) > balance) {
      return res.status(409).json({
        error: 'OVERPAYMENT_NOT_ALLOWED',
        message: `Montant maximum autorisé: ${balance} MGA`,
        balance_mga: balance
      });
    }

    // Create payment
    const paymentCount = await Payment.count();
    const payment = await Payment.create({
      invoice_id: invoice.id,
      clinic_id: req.clinic_id,
      payment_number: `PAY-${String(paymentCount + 1).padStart(6, '0')}`,
      amount_mga: parseFloat(amount_mga),
      payment_method,
      reference_number,
      notes,
      processed_by_user_id: req.user.id,
      status: 'COMPLETED'
    });

    // Calculate new totals
    const newPaidTotal = currentPaid + parseFloat(amount_mga);
    const newBalance = parseFloat(invoice.total_mga) - newPaidTotal;
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

    // Update invoice status
    await invoice.update({
      status: newStatus,
      paid_at: newStatus === 'PAID' ? new Date() : invoice.paid_at
    });

    res.status(201).json({
      message: 'Paiement enregistré',
      payment,
      paid_total_mga: newPaidTotal,
      balance_mga: newBalance,
      payment_status: newStatus
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * @route DELETE /api/payments/:id
 * @desc Cancel/delete a payment (SUPER_ADMIN or creator only)
 */
router.delete('/payments/:paymentId', requireClinicId, [
  param('paymentId').isUUID()
], async (req, res) => {
  try {
    const payment = await Payment.findOne({
      where: { id: req.params.paymentId },
      include: [{ model: Invoice, as: 'invoice' }]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    // Check access: SUPER_ADMIN or creator
    if (req.user.role !== 'SUPER_ADMIN' && payment.processed_by_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Check clinic
    if (payment.invoice.clinic_id !== req.clinic_id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await payment.update({ status: 'CANCELLED' });

    // Recalculate invoice status
    const remainingPayments = await Payment.findAll({
      where: { invoice_id: payment.invoice_id, status: 'COMPLETED' }
    });
    const paidTotal = remainingPayments.reduce((sum, p) => sum + parseFloat(p.amount_mga || 0), 0);
    const newStatus = paidTotal <= 0 ? 'DRAFT' : (paidTotal >= parseFloat(payment.invoice.total_mga) ? 'PAID' : 'PARTIAL');

    await payment.invoice.update({ status: newStatus });

    res.json({ message: 'Paiement annulé', new_status: newStatus });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route GET /api/invoices/:id/print
 * @desc Get printable HTML view of invoice
 */
router.get('/:id/print', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { 
        id: req.params.id,
        [Op.or]: [
          { clinic_id: req.clinic_id },
          ...(req.user.role === 'SUPER_ADMIN' ? [{}] : [])
        ]
      },
      include: [
        { model: Patient, as: 'patient' },
        { model: InvoiceItem, as: 'items' }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Get clinic info
    const clinic = await Clinic.findByPk(invoice.clinic_id);

    // Get payments
    const payments = await Payment.findAll({
      where: { invoice_id: invoice.id, status: 'COMPLETED' },
      order: [['payment_date', 'ASC']]
    });

    const paidTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount_mga || 0), 0);
    const balance = parseFloat(invoice.total_mga) - paidTotal;

    const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG', { style: 'decimal' }).format(amount) + ' Ar';
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('fr-FR') : '-';

    const paymentMethodLabels = {
      'CASH': 'Espèces',
      'CHEQUE': 'Chèque',
      'CARD': 'Carte',
      'MVOLA': 'MVola',
      'ORANGE_MONEY': 'Orange Money',
      'AIRTEL_MONEY': 'Airtel Money',
      'BANK_TRANSFER': 'Virement'
    };

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; padding: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .clinic-info h1 { font-size: 24px; color: #2563eb; margin-bottom: 5px; }
    .clinic-info p { color: #666; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 28px; color: #333; }
    .invoice-meta .number { font-size: 16px; color: #2563eb; font-weight: bold; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 45%; }
    .party h3 { font-size: 14px; color: #2563eb; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .party p { margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8fafc; font-weight: 600; color: #2563eb; }
    .amount { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals table { margin-bottom: 0; }
    .totals td { border: none; padding: 5px 10px; }
    .totals .total-row { font-size: 16px; font-weight: bold; background: #2563eb; color: white; }
    .totals .balance-row { background: ${balance > 0 ? '#fef3c7' : '#d1fae5'}; }
    .payments { margin-top: 20px; }
    .payments h3 { font-size: 14px; color: #2563eb; margin-bottom: 10px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 11px; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-partial { background: #fef3c7; color: #92400e; }
    .status-unpaid { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 10px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="clinic-info">
      <h1>${clinic?.name || 'Cabinet Dentaire'}</h1>
      <p>${clinic?.address || ''}</p>
      <p>${clinic?.phone || ''}</p>
      ${clinic?.email ? `<p>${clinic.email}</p>` : ''}
      ${invoice.clinic_nif ? `<p>NIF: ${invoice.clinic_nif}</p>` : ''}
      ${invoice.clinic_stat ? `<p>STAT: ${invoice.clinic_stat}</p>` : ''}
    </div>
    <div class="invoice-meta">
      <h2>FACTURE</h2>
      <p class="number">${invoice.invoice_number}</p>
      <p>Date: ${formatDate(invoice.invoice_date)}</p>
      ${invoice.due_date ? `<p>Échéance: ${formatDate(invoice.due_date)}</p>` : ''}
      <p class="status ${balance <= 0 ? 'status-paid' : paidTotal > 0 ? 'status-partial' : 'status-unpaid'}">
        ${balance <= 0 ? 'PAYÉE' : paidTotal > 0 ? 'PARTIEL' : 'IMPAYÉE'}
      </p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Patient</h3>
      <p><strong>${invoice.patient?.first_name || ''} ${invoice.patient?.last_name || ''}</strong></p>
      <p>${invoice.patient?.phone_primary || ''}</p>
      <p>${invoice.patient?.email || ''}</p>
      ${invoice.nif_number ? `<p>NIF: ${invoice.nif_number}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50%">Description</th>
        <th class="amount">Qté</th>
        <th class="amount">Prix unit.</th>
        <th class="amount">Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>${item.description}${item.tooth_number ? ` (Dent ${item.tooth_number})` : ''}</td>
          <td class="amount">${item.quantity}</td>
          <td class="amount">${formatCurrency(item.unit_price_mga)}</td>
          <td class="amount">${formatCurrency(item.total_price_mga)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Sous-total</td><td class="amount">${formatCurrency(invoice.subtotal_mga)}</td></tr>
      ${invoice.discount_percentage > 0 ? `<tr><td>Remise (${invoice.discount_percentage}%)</td><td class="amount">-${formatCurrency(invoice.discount_amount_mga)}</td></tr>` : ''}
      ${invoice.tax_percentage > 0 ? `<tr><td>TVA (${invoice.tax_percentage}%)</td><td class="amount">${formatCurrency(invoice.tax_amount_mga)}</td></tr>` : ''}
      <tr class="total-row"><td>Total</td><td class="amount">${formatCurrency(invoice.total_mga)}</td></tr>
      <tr><td>Payé</td><td class="amount">${formatCurrency(paidTotal)}</td></tr>
      <tr class="balance-row"><td><strong>Reste à payer</strong></td><td class="amount"><strong>${formatCurrency(balance)}</strong></td></tr>
    </table>
  </div>

  ${payments.length > 0 ? `
  <div class="payments">
    <h3>Historique des paiements</h3>
    <table>
      <thead><tr><th>Date</th><th>Méthode</th><th>Référence</th><th class="amount">Montant</th></tr></thead>
      <tbody>
        ${payments.map(p => `
          <tr>
            <td>${formatDate(p.payment_date)}</td>
            <td>${paymentMethodLabels[p.payment_method] || p.payment_method}</td>
            <td>${p.reference_number || '-'}</td>
            <td class="amount">${formatCurrency(p.amount_mga)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${invoice.notes ? `<p style="margin-top: 20px; color: #666;"><em>Notes: ${invoice.notes}</em></p>` : ''}

  <div class="footer">
    <p>${invoice.payment_terms || 'Payable à réception'}</p>
    <p>Merci de votre confiance</p>
  </div>

  <script>
    // Auto-print if opened in new window
    if (window.opener) {
      window.print();
    }
  </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Print invoice error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route GET /api/invoices/:id/pdf
 * @desc Generate and download PDF of invoice (Premium)
 */
router.get('/:id/pdf', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { generateInvoicePDF } = require('../utils/pdfGenerator');
    
    const invoice = await Invoice.findOne({
      where: { 
        id: req.params.id,
        [Op.or]: [
          { clinic_id: req.clinic_id },
          ...(req.user.role === 'SUPER_ADMIN' ? [{}] : [])
        ]
      },
      include: [
        { model: Patient, as: 'patient' },
        { model: InvoiceItem, as: 'items' }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Get clinic info
    const clinic = await Clinic.findByPk(invoice.clinic_id);

    // Get payments
    const payments = await Payment.findAll({
      where: { invoice_id: invoice.id, status: 'COMPLETED' },
      order: [['payment_date', 'ASC']]
    });

    // Generate PDF using PDFKit
    const pdfBuffer = await generateInvoicePDF(invoice, clinic, payments);
    
    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF invoice error:', error);
    res.status(500).json({ error: 'Erreur génération PDF', details: error.message });
  }
});

module.exports = router;