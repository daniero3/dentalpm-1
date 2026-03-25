const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Invoice, InvoiceItem, Patient, Clinic, AuditLog, PricingSchedule } = require('../models');
const { requireClinicId } = require('../middleware/clinic');
const { Op } = require('sequelize');

const router = express.Router();

// =========================
// Helpers
// =========================
function isSuperAdmin(req) { return req.user?.role === 'SUPER_ADMIN'; }
function getCurrentUserId(req) { return req.user?.id || req.user?.userId || null; }
function getCurrentClinicId(req) { return req.clinic_id || req.user?.clinic_id || null; }

function requireClinicOrSuperAdmin(req, res, next) {
  if (isSuperAdmin(req)) return next();
  return requireClinicId(req, res, next);
}

function buildScopedWhere(req, baseWhere = {}) {
  const where = { ...baseWhere };
  if (!isSuperAdmin(req)) {
    where.clinic_id = getCurrentClinicId(req);
  }
  return where;
}

function validateRequest(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Données invalides', details: errors.array() });
    return false;
  }
  return true;
}

async function generateQuoteNumber(clinicId) {
  const year = new Date().getFullYear();
  const whereClause = { document_type: 'QUOTE', invoice_number: { [Op.like]: `DEV-${year}-%` } };
  if (clinicId) whereClause.clinic_id = clinicId;
  const count = await Invoice.count({ where: whereClause });
  return `DEV-${year}-${String(count + 1).padStart(4, '0')}`;
}

async function generateInvoiceNumber(clinicId) {
  const year = new Date().getFullYear();
  const whereClause = { document_type: 'INVOICE', invoice_number: { [Op.like]: `FACT-${year}-%` } };
  if (clinicId) whereClause.clinic_id = clinicId;
  const count = await Invoice.count({ where: whereClause });
  return `FACT-${year}-${String(count + 1).padStart(4, '0')}`;
}

const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG').format(amount || 0) + ' Ar';

// ✅ Statuts qui BLOQUENT la conversion
const UNCONVERTIBLE_STATUSES = ['CONVERTED', 'EXPIRED', 'REJECTED', 'CANCELLED', 'PAID'];

// ✅ Statuts valides pour un devis
const VALID_QUOTE_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'CONVERTED', 'PAID'];

// =========================
// Routes
// =========================

router.get('/', requireClinicOrSuperAdmin, [
  query('status').optional().isString(),
  query('patient_id').optional().isUUID(),
  query('clinic_id').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 })
], async (req, res) => {
  try {
    if (!validateRequest(req, res)) return;
    const { status, patient_id, clinic_id, page = 1, limit = 50 } = req.query;
    const whereClause = { document_type: 'QUOTE' };
    if (isSuperAdmin(req)) { if (clinic_id) whereClause.clinic_id = clinic_id; }
    else { whereClause.clinic_id = getCurrentClinicId(req); }
    if (status) whereClause.status = status;
    if (patient_id) whereClause.patient_id = patient_id;
    const parsedPage  = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const quotes = await Invoice.findAll({
      where: whereClause,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name', 'phone_primary'], required: false },
        { model: InvoiceItem, as: 'items', required: false }
      ],
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset: (parsedPage - 1) * parsedLimit
    });
    const total = await Invoice.count({ where: whereClause });
    return res.json({ quotes, pagination: { total, page: parsedPage, limit: parsedLimit, pages: Math.ceil(total / parsedLimit) } });
  } catch (error) {
    console.error('List quotes error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

router.post('/', requireClinicOrSuperAdmin, [
  body('patient_id').isUUID(),
  body('schedule_id').isUUID(),
  body('clinic_id').optional({ nullable: true, checkFalsy: true }).isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.description').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unit_price_mga').isFloat({ min: 0 }),
  body('discount_percentage').optional().isFloat({ min: 0, max: 100 }),
  body('validity_days').optional().isInt({ min: 1, max: 365 }),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    if (!validateRequest(req, res)) return;
    const { patient_id, schedule_id, clinic_id: bodyClinicId, items, discount_percentage = 0, validity_days = 30, notes } = req.body;
    const patientWhere = isSuperAdmin(req) ? { id: patient_id } : { id: patient_id, clinic_id: getCurrentClinicId(req) };
    const patient = await Patient.findOne({ where: patientWhere });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });
    const finalClinicId = isSuperAdmin(req) ? (bodyClinicId || patient.clinic_id || null) : getCurrentClinicId(req);
    let scheduleWhere = isSuperAdmin(req)
      ? { id: schedule_id, is_active: true }
      : { id: schedule_id, is_active: true, [Op.or]: [{ clinic_id: null, type: 'SYNDICAL' }, { clinic_id: getCurrentClinicId(req) }] };
    const schedule = await PricingSchedule.findOne({ where: scheduleWhere });
    if (!schedule) return res.status(404).json({ error: 'Grille tarifaire non trouvée' });
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price_mga)), 0);
    const discountAmount = (subtotal * Number(discount_percentage)) / 100;
    const total = subtotal - discountAmount;
    const quoteNumber = await generateQuoteNumber(finalClinicId);
    const quote = await Invoice.create({
      document_type: 'QUOTE', invoice_number: quoteNumber, patient_id, schedule_id,
      clinic_id: finalClinicId, invoice_date: new Date(),
      subtotal_mga: subtotal, discount_percentage: Number(discount_percentage),
      discount_amount_mga: discountAmount, total_mga: total,
      validity_days: Number(validity_days), notes: notes || null,
      status: 'DRAFT', created_by_user_id: getCurrentUserId(req)
    });
    await Promise.all(items.map(item => InvoiceItem.create({
      invoice_id: quote.id, description: item.description, quantity: Number(item.quantity),
      unit_price_mga: Number(item.unit_price_mga), total_price_mga: Number(item.quantity) * Number(item.unit_price_mga),
      procedure_id: item.procedure_id || null, tooth_number: item.tooth_number || null, notes: item.notes || null
    })));
    try {
      await AuditLog.create({ user_id: getCurrentUserId(req), action: 'CREATE', resource_type: 'quotes', resource_id: quote.id, new_values: { patient_id, total_mga: total }, ip_address: req.ip, description: `Devis créé: ${quoteNumber} (${formatCurrency(total)})` });
    } catch (e) { console.warn('AuditLog error (non-fatal):', e.message); }
    const completeQuote = await Invoice.findByPk(quote.id, {
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name'], required: false }, { model: InvoiceItem, as: 'items', required: false }]
    });
    return res.status(201).json({ message: 'Devis créé', quote: completeQuote });
  } catch (error) {
    console.error('Create quote error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

router.get('/:id', requireClinicOrSuperAdmin, [param('id').isUUID()], async (req, res) => {
  try {
    if (!validateRequest(req, res)) return;
    const quote = await Invoice.findOne({
      where: buildScopedWhere(req, { id: req.params.id, document_type: 'QUOTE' }),
      include: [{ model: Patient, as: 'patient', required: false }, { model: InvoiceItem, as: 'items', required: false }]
    });
    if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
    if (quote.validity_days && !['CONVERTED', 'EXPIRED', 'PAID', 'CANCELLED'].includes(quote.status)) {
      const expiryDate = new Date(quote.invoice_date);
      expiryDate.setDate(expiryDate.getDate() + quote.validity_days);
      if (new Date() > expiryDate && quote.status !== 'ACCEPTED') {
        await quote.update({ status: 'EXPIRED' });
        quote.status = 'EXPIRED';
      }
    }
    return res.json({ quote });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

router.put('/:id', requireClinicOrSuperAdmin, [
  param('id').isUUID(),
  body('items').optional().isArray(),
  body('discount_percentage').optional().isFloat({ min: 0, max: 100 }),
  body('validity_days').optional().isInt({ min: 1 }),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    if (!validateRequest(req, res)) return;
    const quote = await Invoice.findOne({ where: buildScopedWhere(req, { id: req.params.id, document_type: 'QUOTE' }) });
    if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
    if (!['DRAFT', 'SENT'].includes(quote.status)) return res.status(400).json({ error: `Impossible de modifier un devis ${quote.status}` });
    const { items, discount_percentage, validity_days, notes } = req.body;
    let subtotal = Number(quote.subtotal_mga || 0);
    let discPct = Number(discount_percentage !== undefined ? discount_percentage : quote.discount_percentage || 0);
    if (items && items.length > 0) {
      await InvoiceItem.destroy({ where: { invoice_id: quote.id } });
      await Promise.all(items.map(item => InvoiceItem.create({ invoice_id: quote.id, description: item.description, quantity: Number(item.quantity), unit_price_mga: Number(item.unit_price_mga), total_price_mga: Number(item.quantity) * Number(item.unit_price_mga), procedure_id: item.procedure_id || null, tooth_number: item.tooth_number || null, notes: item.notes || null })));
      subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price_mga)), 0);
    }
    const discountAmount = (subtotal * discPct) / 100;
    const updates = { subtotal_mga: subtotal, discount_percentage: discPct, discount_amount_mga: discountAmount, total_mga: subtotal - discountAmount };
    if (validity_days !== undefined) updates.validity_days = Number(validity_days);
    if (notes !== undefined) updates.notes = notes;
    await quote.update(updates);
    const updatedQuote = await Invoice.findByPk(quote.id, { include: [{ model: Patient, as: 'patient', required: false }, { model: InvoiceItem, as: 'items', required: false }] });
    return res.json({ message: 'Devis mis à jour', quote: updatedQuote });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

router.patch('/:id/status', requireClinicOrSuperAdmin, [
  param('id').isUUID(),
  body('status').isIn(VALID_QUOTE_STATUSES)
], async (req, res) => {
  try {
    if (!validateRequest(req, res)) return;
    const quote = await Invoice.findOne({ where: buildScopedWhere(req, { id: req.params.id, document_type: 'QUOTE' }) });
    if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
    if (quote.status === 'CONVERTED') return res.status(400).json({ error: 'Devis déjà converti en facture' });
    const { status } = req.body;
    await quote.update({ status, sent_at: status === 'SENT' ? new Date() : quote.sent_at });
    return res.json({ message: 'Statut mis à jour', quote });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ✅ Route convert — bloque PAID, EXPIRED, CONVERTED, REJECTED, CANCELLED
router.post('/:id/convert', requireClinicOrSuperAdmin, [param('id').isUUID()], async (req, res) => {
  try {
    if (!validateRequest(req, res)) return;
    const quote = await Invoice.findOne({
      where: buildScopedWhere(req, { id: req.params.id, document_type: 'QUOTE' }),
      include: [{ model: InvoiceItem, as: 'items', required: false }]
    });
    if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });

    // ✅ Message d'erreur clair selon le statut
    if (quote.status === 'CONVERTED') return res.status(400).json({ error: 'Ce devis a déjà été converti en facture', invoice_id: quote.converted_to_invoice_id });
    if (quote.status === 'PAID')      return res.status(400).json({ error: 'Ce devis est déjà payé — créez directement une facture' });
    if (quote.status === 'EXPIRED')   return res.status(400).json({ error: 'Ce devis a expiré — veuillez créer un nouveau devis' });
    if (quote.status === 'REJECTED')  return res.status(400).json({ error: 'Ce devis a été refusé par le patient' });
    if (quote.status === 'CANCELLED') return res.status(400).json({ error: 'Ce devis a été annulé' });

    const finalClinicId = quote.clinic_id || null;
    const invoiceNumber = await generateInvoiceNumber(finalClinicId);
    const invoice = await Invoice.create({
      document_type: 'INVOICE', invoice_number: invoiceNumber,
      patient_id: quote.patient_id, schedule_id: quote.schedule_id,
      clinic_id: finalClinicId, invoice_date: new Date(),
      due_date: quote.due_date || null,
      subtotal_mga: quote.subtotal_mga, discount_percentage: quote.discount_percentage,
      discount_amount_mga: quote.discount_amount_mga, discount_type: quote.discount_type || null,
      tax_percentage: quote.tax_percentage || 0, tax_amount_mga: quote.tax_amount_mga || 0,
      total_mga: quote.total_mga,
      notes: quote.notes ? `Converti du devis ${quote.invoice_number}. ${quote.notes}` : `Converti du devis ${quote.invoice_number}`,
      status: 'DRAFT', created_by_user_id: getCurrentUserId(req)
    });
    await Promise.all((quote.items || []).map(item => InvoiceItem.create({ invoice_id: invoice.id, description: item.description, quantity: item.quantity, unit_price_mga: item.unit_price_mga, total_price_mga: item.total_price_mga, procedure_id: item.procedure_id || null, tooth_number: item.tooth_number || null, notes: item.notes || null })));
    await quote.update({ status: 'CONVERTED', converted_to_invoice_id: invoice.id });
    try {
      await AuditLog.create({ user_id: getCurrentUserId(req), action: 'CONVERT', resource_type: 'quotes', resource_id: quote.id, new_values: { invoice_id: invoice.id, invoice_number: invoiceNumber }, ip_address: req.ip, description: `Devis ${quote.invoice_number} converti en facture ${invoiceNumber}` });
    } catch (e) { console.warn('AuditLog error (non-fatal):', e.message); }
    const completeInvoice = await Invoice.findByPk(invoice.id, { include: [{ model: Patient, as: 'patient', required: false }, { model: InvoiceItem, as: 'items', required: false }] });
    return res.status(201).json({ message: 'Devis converti en facture', quote_id: quote.id, quote_number: quote.invoice_number, invoice: completeInvoice });
  } catch (error) {
    console.error('Convert quote error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

router.delete('/:id', requireClinicOrSuperAdmin, [param('id').isUUID()], async (req, res) => {
  try {
    if (!validateRequest(req, res)) return;
    const quote = await Invoice.findOne({ where: buildScopedWhere(req, { id: req.params.id, document_type: 'QUOTE' }) });
    if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
    if (quote.status !== 'DRAFT') return res.status(400).json({ error: 'Seuls les devis en brouillon peuvent être supprimés' });
    await InvoiceItem.destroy({ where: { invoice_id: quote.id } });
    await quote.destroy();
    return res.json({ message: 'Devis supprimé' });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

router.get('/:id/print', requireClinicOrSuperAdmin, [param('id').isUUID()], async (req, res) => {
  try {
    if (!validateRequest(req, res)) return;
    const quote = await Invoice.findOne({
      where: buildScopedWhere(req, { id: req.params.id, document_type: 'QUOTE' }),
      include: [{ model: Patient, as: 'patient', required: false }, { model: InvoiceItem, as: 'items', required: false }]
    });
    if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
    const clinic = quote.clinic_id ? await Clinic.findByPk(quote.clinic_id) : null;
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('fr-FR') : '-';
    const expiryDate = new Date(quote.invoice_date);
    expiryDate.setDate(expiryDate.getDate() + (quote.validity_days || 30));
    const isExpired = new Date() > expiryDate && !['ACCEPTED', 'CONVERTED', 'PAID'].includes(quote.status);
    const statusLabels = { DRAFT:'Brouillon', SENT:'Envoyé', ACCEPTED:'Accepté', REJECTED:'Refusé', EXPIRED:'Expiré', CONVERTED:'Converti', CANCELLED:'Annulé', PAID:'Payé' };
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Devis ${quote.invoice_number}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.4;color:#333;padding:20px}.header{display:flex;justify-content:space-between;margin-bottom:30px;border-bottom:2px solid #059669;padding-bottom:20px}.clinic-info h1{font-size:24px;color:#059669;margin-bottom:5px}.clinic-info p{color:#666}.quote-meta{text-align:right}.quote-meta h2{font-size:28px;color:#333}.quote-meta .number{font-size:16px;color:#059669;font-weight:bold}.parties{display:flex;justify-content:space-between;margin-bottom:30px}.party{width:45%}.party h3{font-size:14px;color:#059669;margin-bottom:10px;border-bottom:1px solid #ddd;padding-bottom:5px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{padding:10px;text-align:left;border-bottom:1px solid #ddd}th{background:#f8fafc;font-weight:600;color:#059669}.amount{text-align:right}.totals{margin-left:auto;width:300px}.totals table{margin-bottom:0}.totals td{border:none;padding:5px 10px}.totals .total-row{font-size:16px;font-weight:bold;background:#059669;color:white}.validity{margin-top:20px;padding:15px;background:${isExpired?'#fef2f2':'#f0fdf4'};border-radius:8px}.validity p{color:${isExpired?'#991b1b':'#166534'}}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;text-align:center;color:#666;font-size:10px}@media print{body{padding:0}.no-print{display:none}}</style></head><body>
    <div class="header"><div class="clinic-info"><h1>${clinic?.name||'Cabinet Dentaire Madagascar'}</h1><p>${clinic?.address||''}</p><p>${clinic?.phone||''}</p>${clinic?.email?`<p>${clinic.email}</p>`:''}</div><div class="quote-meta"><h2>DEVIS</h2><p class="number">${quote.invoice_number}</p><p>Date: ${formatDate(quote.invoice_date)}</p><p>Valide jusqu'au: ${formatDate(expiryDate)}</p><p>${statusLabels[quote.status]||quote.status}</p></div></div>
    <div class="parties"><div class="party"><h3>Patient</h3><p><strong>${quote.patient?.first_name||''} ${quote.patient?.last_name||''}</strong></p><p>${quote.patient?.phone_primary||''}</p></div></div>
    <table><thead><tr><th style="width:50%">Description</th><th class="amount">Qté</th><th class="amount">Prix unit.</th><th class="amount">Total</th></tr></thead><tbody>${(quote.items||[]).map(item=>`<tr><td>${item.description}${item.tooth_number?` (Dent ${item.tooth_number})`:''}</td><td class="amount">${item.quantity}</td><td class="amount">${formatCurrency(item.unit_price_mga)}</td><td class="amount">${formatCurrency(item.total_price_mga)}</td></tr>`).join('')}</tbody></table>
    <div class="totals"><table><tr><td>Sous-total</td><td class="amount">${formatCurrency(quote.subtotal_mga)}</td></tr>${parseFloat(quote.discount_percentage||0)>0?`<tr><td>Remise (${quote.discount_percentage}%)</td><td class="amount">-${formatCurrency(quote.discount_amount_mga)}</td></tr>`:''}<tr class="total-row"><td>Total</td><td class="amount">${formatCurrency(quote.total_mga)}</td></tr></table></div>
    <div class="validity"><p><strong>Validité:</strong> Ce devis est valable ${quote.validity_days||30} jours${isExpired?' (EXPIRÉ)':''}.</p><p>Les prix sont exprimés en Ariary malgache (MGA).</p></div>
    ${quote.notes?`<p style="margin-top:20px;color:#666;"><em>Notes: ${quote.notes}</em></p>`:''}
    <div class="footer"><p>Ce document est un devis et ne constitue pas une facture.</p><p>Merci de votre confiance</p></div>
    <script>if(window.opener){window.print();}</script></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

router.get('/:id/pdf', requireClinicOrSuperAdmin, [param('id').isUUID()], async (req, res) => {
  try {
    if (!validateRequest(req, res)) return;
    const { generateQuotePDF } = require('../utils/pdfGenerator');
    const quote = await Invoice.findOne({
      where: buildScopedWhere(req, { id: req.params.id, document_type: 'QUOTE' }),
      include: [{ model: Patient, as: 'patient', required: false }, { model: InvoiceItem, as: 'items', required: false }]
    });
    if (!quote) return res.status(404).json({ error: 'Devis non trouvé' });
    const clinic = quote.clinic_id ? await Clinic.findByPk(quote.clinic_id) : null;
    const pdfBuffer = await generateQuotePDF(quote, clinic);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quote.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ error: 'Erreur génération PDF', details: error.message });
  }
});

module.exports = router;
