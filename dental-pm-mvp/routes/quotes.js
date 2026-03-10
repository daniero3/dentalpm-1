const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Invoice, InvoiceItem, Patient, Clinic, AuditLog, PricingSchedule } = require('../models');
const { requireClinicId } = require('../middleware/clinic');
const { Op } = require('sequelize');

const router = express.Router();

// Helper: Generate quote number
async function generateQuoteNumber(clinicId) {
  const year = new Date().getFullYear();
  const whereClause = {
    document_type: 'QUOTE',
    invoice_number: { [Op.like]: `DEV-${year}-%` }
  };
  if (clinicId) whereClause.clinic_id = clinicId;
  const count = await Invoice.count({ where: whereClause });
  return `DEV-${year}-${String(count + 1).padStart(4, '0')}`;
}

// Helper: Format currency
const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG').format(amount) + ' Ar';

/**
 * @route GET /api/quotes
 * @desc List all quotes for clinic
 */
router.get('/', requireClinicId, async (req, res) => {
  try {
    const { status, patient_id, page = 1, limit = 50 } = req.query;
    
    const whereClause = { document_type: 'QUOTE' };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;
    if (status) whereClause.status = status;
    if (patient_id) whereClause.patient_id = patient_id;

    const quotes = await Invoice.findAll({
      where: whereClause,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'phone_primary'] },
        { model: InvoiceItem, as: 'items' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const total = await Invoice.count({ where: whereClause });

    res.json({
      quotes,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('List quotes error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route POST /api/quotes
 * @desc Create a new quote
 */
router.post('/', requireClinicId, [
  body('patient_id').isUUID(),
  body('schedule_id').isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.description').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unit_price_mga').isFloat({ min: 0 }),
  body('discount_percentage').optional().isFloat({ min: 0, max: 100 }),
  body('validity_days').optional().isInt({ min: 1, max: 365 }),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { patient_id, schedule_id, items, discount_percentage = 0, validity_days = 30, notes } = req.body;

    // Verify patient
    const patientWhere = { id: patient_id };
    if (req.clinic_id) patientWhere.clinic_id = req.clinic_id;
    const patient = await Patient.findOne({ where: patientWhere });
    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    // Verify schedule (clinic or global SYNDICAL)
    const scheduleWhere = {
      id: schedule_id,
      is_active: true,
      [Op.or]: [{ clinic_id: null, type: 'SYNDICAL' }]
    };
    if (req.clinic_id) scheduleWhere[Op.or].push({ clinic_id: req.clinic_id });
    const schedule = await PricingSchedule.findOne({ where: scheduleWhere });
    if (!schedule) {
      return res.status(404).json({ error: 'Grille tarifaire non trouvée' });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price_mga), 0);
    const discountAmount = (subtotal * discount_percentage) / 100;
    const total = subtotal - discountAmount;

    // Generate quote number
    const quoteNumber = await generateQuoteNumber(req.clinic_id);

    // Create quote
    const quoteData = {
      document_type: 'QUOTE',
      invoice_number: quoteNumber,
      patient_id,
      schedule_id,
      invoice_date: new Date(),
      subtotal_mga: subtotal,
      discount_percentage,
      discount_amount_mga: discountAmount,
      total_mga: total,
      validity_days,
      notes,
      status: 'DRAFT',
      created_by_user_id: req.user.id
    };
    if (req.clinic_id) quoteData.clinic_id = req.clinic_id;

    const quote = await Invoice.create(quoteData);

    // Create items
    await Promise.all(items.map(item => InvoiceItem.create({
      invoice_id: quote.id,
      description: item.description,
      quantity: item.quantity,
      unit_price_mga: item.unit_price_mga,
      total_price_mga: item.quantity * item.unit_price_mga,
      procedure_id: item.procedure_id,
      tooth_number: item.tooth_number
    })));

    // Audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'quotes',
      resource_id: quote.id,
      new_values: { patient_id, total_mga: total },
      ip_address: req.ip,
      description: `Devis créé: ${quoteNumber} (${formatCurrency(total)})`
    });

    // Fetch complete quote
    const completeQuote = await Invoice.findByPk(quote.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name'] },
        { model: InvoiceItem, as: 'items' }
      ]
    });

    res.status(201).json({ message: 'Devis créé', quote: completeQuote });
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * @route GET /api/quotes/:id
 * @desc Get quote details
 */
router.get('/:id', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const whereClause = { id: req.params.id, document_type: 'QUOTE' };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const quote = await Invoice.findOne({
      where: whereClause,
      include: [
        { model: Patient, as: 'patient' },
        { model: InvoiceItem, as: 'items' }
      ]
    });

    if (!quote) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    // Check if expired
    if (quote.validity_days && quote.status !== 'CONVERTED' && quote.status !== 'EXPIRED') {
      const expiryDate = new Date(quote.invoice_date);
      expiryDate.setDate(expiryDate.getDate() + quote.validity_days);
      if (new Date() > expiryDate && quote.status !== 'ACCEPTED') {
        await quote.update({ status: 'EXPIRED' });
      }
    }

    res.json({ quote });
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route PUT /api/quotes/:id
 * @desc Update quote (only DRAFT/SENT)
 */
router.put('/:id', requireClinicId, [
  param('id').isUUID(),
  body('items').optional().isArray(),
  body('discount_percentage').optional().isFloat({ min: 0, max: 100 }),
  body('validity_days').optional().isInt({ min: 1 }),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const whereClause = { id: req.params.id, document_type: 'QUOTE' };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const quote = await Invoice.findOne({ where: whereClause });

    if (!quote) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    if (!['DRAFT', 'SENT'].includes(quote.status)) {
      return res.status(400).json({ error: 'Impossible de modifier un devis ' + quote.status });
    }

    const { items, discount_percentage, validity_days, notes } = req.body;

    if (items && items.length > 0) {
      await InvoiceItem.destroy({ where: { invoice_id: quote.id } });
      await Promise.all(items.map(item => InvoiceItem.create({
        invoice_id: quote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price_mga: item.unit_price_mga,
        total_price_mga: item.quantity * item.unit_price_mga,
        procedure_id: item.procedure_id,
        tooth_number: item.tooth_number
      })));

      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price_mga), 0);
      const discPct = discount_percentage ?? quote.discount_percentage;
      const discountAmount = (subtotal * discPct) / 100;
      
      await quote.update({
        subtotal_mga: subtotal,
        discount_percentage: discPct,
        discount_amount_mga: discountAmount,
        total_mga: subtotal - discountAmount
      });
    }

    const updates = {};
    if (discount_percentage !== undefined) updates.discount_percentage = discount_percentage;
    if (validity_days !== undefined) updates.validity_days = validity_days;
    if (notes !== undefined) updates.notes = notes;
    
    if (Object.keys(updates).length > 0) {
      await quote.update(updates);
    }

    const updatedQuote = await Invoice.findByPk(quote.id, {
      include: [{ model: Patient, as: 'patient' }, { model: InvoiceItem, as: 'items' }]
    });

    res.json({ message: 'Devis mis à jour', quote: updatedQuote });
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route PATCH /api/quotes/:id/status
 * @desc Update quote status
 */
router.patch('/:id/status', requireClinicId, [
  param('id').isUUID(),
  body('status').isIn(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'])
], async (req, res) => {
  try {
    const whereClause = { id: req.params.id, document_type: 'QUOTE' };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const quote = await Invoice.findOne({ where: whereClause });

    if (!quote) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    if (quote.status === 'CONVERTED') {
      return res.status(400).json({ error: 'Devis déjà converti en facture' });
    }

    const { status } = req.body;
    await quote.update({
      status,
      sent_at: status === 'SENT' ? new Date() : quote.sent_at
    });

    res.json({ message: 'Statut mis à jour', quote });
  } catch (error) {
    console.error('Update quote status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route POST /api/quotes/:id/convert
 * @desc Convert quote to invoice
 */
router.post('/:id/convert', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const whereClause = { id: req.params.id, document_type: 'QUOTE' };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const quote = await Invoice.findOne({
      where: whereClause,
      include: [{ model: InvoiceItem, as: 'items' }]
    });

    if (!quote) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    if (quote.status === 'CONVERTED') {
      return res.status(400).json({ error: 'Devis déjà converti', invoice_id: quote.converted_to_invoice_id });
    }

    if (!['DRAFT', 'SENT', 'ACCEPTED'].includes(quote.status)) {
      return res.status(400).json({ error: `Impossible de convertir un devis ${quote.status}` });
    }

    // Generate invoice number
    const year = new Date().getFullYear();
    const allInvoices = await Invoice.findAll({
      where: {
        document_type: 'INVOICE',
        invoice_number: { [Op.like]: `FACT-${year}-%` }
      },
      order: [['invoice_number', 'DESC']],
      limit: 1
    });
    
    let nextNum = 1;
    if (allInvoices.length > 0) {
      const lastNum = allInvoices[0].invoice_number.split('-').pop();
      nextNum = parseInt(lastNum) + 1;
    }
    const invoiceNumber = `FACT-${year}-${String(nextNum).padStart(4, '0')}`;

    // Create invoice from quote
    const invoiceData = {
      document_type: 'INVOICE',
      invoice_number: invoiceNumber,
      patient_id: quote.patient_id,
      schedule_id: quote.schedule_id,
      invoice_date: new Date(),
      due_date: quote.due_date,
      subtotal_mga: quote.subtotal_mga,
      discount_percentage: quote.discount_percentage,
      discount_amount_mga: quote.discount_amount_mga,
      discount_type: quote.discount_type,
      tax_percentage: quote.tax_percentage,
      tax_amount_mga: quote.tax_amount_mga,
      total_mga: quote.total_mga,
      notes: quote.notes ? `Converti du devis ${quote.invoice_number}. ${quote.notes}` : `Converti du devis ${quote.invoice_number}`,
      nif_number: quote.nif_number,
      stat_number: quote.stat_number,
      clinic_nif: quote.clinic_nif,
      clinic_stat: quote.clinic_stat,
      status: 'DRAFT',
      created_by_user_id: req.user.id
    };
    if (req.clinic_id) invoiceData.clinic_id = req.clinic_id;

    const invoice = await Invoice.create(invoiceData);

    // Copy items
    await Promise.all(quote.items.map(item => InvoiceItem.create({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price_mga: item.unit_price_mga,
      total_price_mga: item.total_price_mga,
      procedure_id: item.procedure_id,
      tooth_number: item.tooth_number,
      notes: item.notes
    })));

    // Update quote status
    await quote.update({
      status: 'CONVERTED',
      converted_to_invoice_id: invoice.id
    });

    // Audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CONVERT',
      resource_type: 'quotes',
      resource_id: quote.id,
      new_values: { invoice_id: invoice.id, invoice_number: invoiceNumber },
      ip_address: req.ip,
      description: `Devis ${quote.invoice_number} converti en facture ${invoiceNumber}`
    });

    const completeInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Patient, as: 'patient' },
        { model: InvoiceItem, as: 'items' }
      ]
    });

    res.status(201).json({
      message: 'Devis converti en facture',
      quote_id: quote.id,
      quote_number: quote.invoice_number,
      invoice: completeInvoice
    });
  } catch (error) {
    console.error('Convert quote error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * @route DELETE /api/quotes/:id
 * @desc Delete quote (DRAFT only)
 */
router.delete('/:id', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const whereClause = { id: req.params.id, document_type: 'QUOTE' };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const quote = await Invoice.findOne({ where: whereClause });

    if (!quote) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    if (quote.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Seuls les devis en brouillon peuvent être supprimés' });
    }

    await InvoiceItem.destroy({ where: { invoice_id: quote.id } });
    await quote.destroy();

    res.json({ message: 'Devis supprimé' });
  } catch (error) {
    console.error('Delete quote error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route GET /api/quotes/:id/print
 * @desc Get printable HTML view of quote
 */
router.get('/:id/print', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const quote = await Invoice.findOne({
      where: { id: req.params.id, document_type: 'QUOTE' },
      include: [
        { model: Patient, as: 'patient' },
        { model: InvoiceItem, as: 'items' }
      ]
    });

    if (!quote) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    if (quote.clinic_id && quote.clinic_id !== req.clinic_id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const clinic = quote.clinic_id ? await Clinic.findByPk(quote.clinic_id) : null;
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('fr-FR') : '-';

    const expiryDate = new Date(quote.invoice_date);
    expiryDate.setDate(expiryDate.getDate() + (quote.validity_days || 30));
    const isExpired = new Date() > expiryDate && !['ACCEPTED', 'CONVERTED'].includes(quote.status);

    const statusLabels = {
      'DRAFT': 'Brouillon',
      'SENT': 'Envoyé',
      'ACCEPTED': 'Accepté',
      'REJECTED': 'Refusé',
      'EXPIRED': 'Expiré',
      'CONVERTED': 'Converti',
      'CANCELLED': 'Annulé'
    };

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis ${quote.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; padding: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #059669; padding-bottom: 20px; }
    .clinic-info h1 { font-size: 24px; color: #059669; margin-bottom: 5px; }
    .clinic-info p { color: #666; }
    .quote-meta { text-align: right; }
    .quote-meta h2 { font-size: 28px; color: #333; }
    .quote-meta .number { font-size: 16px; color: #059669; font-weight: bold; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 45%; }
    .party h3 { font-size: 14px; color: #059669; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .party p { margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8fafc; font-weight: 600; color: #059669; }
    .amount { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals table { margin-bottom: 0; }
    .totals td { border: none; padding: 5px 10px; }
    .totals .total-row { font-size: 16px; font-weight: bold; background: #059669; color: white; }
    .validity { margin-top: 20px; padding: 15px; background: ${isExpired ? '#fef2f2' : '#f0fdf4'}; border-radius: 8px; }
    .validity p { color: ${isExpired ? '#991b1b' : '#166534'}; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 11px; }
    .status-accepted { background: #d1fae5; color: #065f46; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-draft { background: #f3f4f6; color: #374151; }
    .status-expired { background: #fee2e2; color: #991b1b; }
    .status-converted { background: #e0e7ff; color: #3730a3; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 10px; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; color: rgba(0,0,0,0.05); pointer-events: none; z-index: -1; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="watermark">DEVIS</div>
  <div class="header">
    <div class="clinic-info">
      <h1>${clinic?.name || 'Cabinet Dentaire Madagascar'}</h1>
      <p>${clinic?.address || ''}</p>
      <p>${clinic?.phone || ''}</p>
      ${clinic?.email ? `<p>${clinic.email}</p>` : ''}
    </div>
    <div class="quote-meta">
      <h2>DEVIS</h2>
      <p class="number">${quote.invoice_number}</p>
      <p>Date: ${formatDate(quote.invoice_date)}</p>
      <p>Valide jusqu'au: ${formatDate(expiryDate)}</p>
      <p class="status status-${quote.status.toLowerCase()}">
        ${statusLabels[quote.status] || quote.status}
      </p>
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <h3>Patient</h3>
      <p><strong>${quote.patient?.first_name || ''} ${quote.patient?.last_name || ''}</strong></p>
      <p>${quote.patient?.phone_primary || ''}</p>
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
      ${quote.items.map(item => `
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
      <tr><td>Sous-total</td><td class="amount">${formatCurrency(quote.subtotal_mga)}</td></tr>
      ${parseFloat(quote.discount_percentage) > 0 ? `<tr><td>Remise (${quote.discount_percentage}%)</td><td class="amount">-${formatCurrency(quote.discount_amount_mga)}</td></tr>` : ''}
      <tr class="total-row"><td>Total</td><td class="amount">${formatCurrency(quote.total_mga)}</td></tr>
    </table>
  </div>
  <div class="validity">
    <p><strong>Validité:</strong> Ce devis est valable ${quote.validity_days || 30} jours à compter de sa date d'émission${isExpired ? ' (EXPIRÉ)' : ''}.</p>
    <p>Les prix sont exprimés en Ariary malgache (MGA).</p>
  </div>
  ${quote.notes ? `<p style="margin-top: 20px; color: #666;"><em>Notes: ${quote.notes}</em></p>` : ''}
  <div class="footer">
    <p>Ce document est un devis et ne constitue pas une facture.</p>
    <p>Merci de votre confiance</p>
  </div>
  <script>if (window.opener) { window.print(); }</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Print quote error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route GET /api/quotes/:id/pdf
 * @desc Generate and download PDF of quote
 */
router.get('/:id/pdf', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const { generateQuotePDF } = require('../utils/pdfGenerator');
    
    const whereClause = { id: req.params.id, document_type: 'QUOTE' };
    if (req.clinic_id && req.user.role !== 'SUPER_ADMIN') whereClause.clinic_id = req.clinic_id;

    const quote = await Invoice.findOne({
      where: whereClause,
      include: [
        { model: Patient, as: 'patient' },
        { model: InvoiceItem, as: 'items' }
      ]
    });

    if (!quote) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    const clinic = quote.clinic_id ? await Clinic.findByPk(quote.clinic_id) : null;
    const pdfBuffer = await generateQuotePDF(quote, clinic);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quote.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF quote error:', error);
    res.status(500).json({ error: 'Erreur génération PDF', details: error.message });
  }
});

module.exports = router;
