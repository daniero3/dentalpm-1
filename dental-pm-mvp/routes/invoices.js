const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Invoice, InvoiceItem, Patient, Payment, Procedure, AuditLog, PricingSchedule, ProcedureFee, Clinic } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { auditLogger } = require('../middleware/auditLogger');
const { requireValidSubscription } = require('../middleware/licensing');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authenticateToken);
router.use(requireValidSubscription);
router.use(auditLogger('invoices'));

// Helper: build clinic where clause (SUPER_ADMIN sees all)
const clinicWhere = (req, extra = {}) => {
  if (req.user.role === 'SUPER_ADMIN') return extra;
  if (req.clinic_id) return { clinic_id: req.clinic_id, ...extra };
  return extra;
};

// ── GET / ────────────────────────────────────────────────────────────────────
router.get('/', requireClinicId, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['DRAFT','SENT','PAID','PARTIAL','OVERDUE','CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Paramètres invalides', details: errors.array() });

    const { page = 1, limit = 20, status, patient_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = clinicWhere(req);
    if (status)     whereClause.status     = status;
    if (patient_id) whereClause.patient_id = patient_id;

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: whereClause,
      include: [
        { model: Patient,     as: 'patient', attributes: ['id','first_name','last_name','phone_primary'], required: false },
        { model: InvoiceItem, as: 'items',   required: false }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['invoice_date','DESC'],['created_at','DESC']]
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
    res.status(500).json({ error: 'Erreur lors de la récupération des factures', message: error.message });
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────────
router.get('/:id', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, ...clinicWhere(req) },
      include: [
        { model: Patient,     as: 'patient', required: false },
        { model: InvoiceItem, as: 'items',   required: false },
        { model: Payment,     as: 'payments', required: false }
      ]
    });
    if (!invoice) return res.status(404).json({ error: 'Facture non trouvée' });

    try {
      await AuditLog.create({
        user_id: req.user.id, action: 'VIEW', resource_type: 'invoices',
        resource_id: invoice.id, ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        description: `Consultation facture: ${invoice.invoice_number}`
      });
    } catch(e) {}

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la facture', message: error.message });
  }
});

// ── POST / — Create invoice ───────────────────────────────────────────────────
router.post('/', requireClinicId, [
  body('patient_id').isUUID().withMessage('ID patient invalide'),
  body('schedule_id').isUUID().withMessage('ID grille tarifaire invalide'),
  body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
  body('items.*.description').isLength({ min: 1, max: 255 }).withMessage('Description requise'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantité invalide'),
  body('items.*.unit_price_mga').isFloat({ min: 0 }).withMessage('Prix invalide'),
  body('discount_percentage').optional().isFloat({ min: 0, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { patient_id, schedule_id, items, discount_percentage = 0, notes } = req.body;

    // Verify patient
    const patient = await Patient.findByPk(patient_id);
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    // Verify pricing schedule — SUPER_ADMIN can use any schedule
    let scheduleWhere = { id: schedule_id, is_active: true };
    if (req.user.role !== 'SUPER_ADMIN' && req.clinic_id) {
      scheduleWhere[Op.or] = [
        { clinic_id: req.clinic_id },
        { clinic_id: null }  // global schedules
      ];
    }
    const pricingSchedule = await PricingSchedule.findOne({ where: scheduleWhere });
    if (!pricingSchedule) {
      return res.status(404).json({ error: 'Grille tarifaire non trouvée ou inactive' });
    }

    // Generate invoice number
    const currentYear = new Date().getFullYear();
    const invoiceCount = await Invoice.count({
      where: {
        created_at: {
          [Op.gte]: new Date(currentYear, 0, 1),
          [Op.lt]:  new Date(currentYear + 1, 0, 1)
        }
      }
    });
    const invoiceNumber = `FACT-${currentYear}-${String(invoiceCount + 1).padStart(4, '0')}`;

    // Calculate totals
    const subtotal       = items.reduce((sum, i) => sum + (i.quantity * i.unit_price_mga), 0);
    const discountAmount = (subtotal * discount_percentage) / 100;
    const total          = subtotal - discountAmount;

    // Determine clinic_id for invoice
    const invoiceClinicId = req.clinic_id || patient.clinic_id || null;

    // Create invoice
    const invoice = await Invoice.create({
      invoice_number:      invoiceNumber,
      patient_id,
      schedule_id:         pricingSchedule.id,
      subtotal_mga:        subtotal,
      discount_percentage,
      discount_amount_mga: discountAmount,
      total_mga:           total,
      notes,
      clinic_id:           invoiceClinicId,
      created_by_user_id:  req.user.id
    });

    // Create items
    await Promise.all(items.map(item => InvoiceItem.create({
      invoice_id:      invoice.id,
      description:     item.description,
      quantity:        item.quantity,
      unit_price_mga:  item.unit_price_mga,
      total_price_mga: item.quantity * item.unit_price_mga,
      procedure_id:    item.procedure_id || null,
      tooth_number:    item.tooth_number || null,
      notes:           item.notes || null
    })));

    try {
      await AuditLog.create({
        user_id: req.user.id, action: 'CREATE', resource_type: 'invoices',
        resource_id: invoice.id, ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        new_values: { patient_id, total_mga: total },
        description: `Nouvelle facture: ${invoiceNumber} (${total} MGA)`
      });
    } catch(e) {}

    const completeInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        { model: Patient,     as: 'patient', attributes: ['id','first_name','last_name','phone_primary'], required: false },
        { model: InvoiceItem, as: 'items',   required: false }
      ]
    });

    res.status(201).json({ message: 'Facture créée avec succès', invoice: completeInvoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la facture', message: error.message });
  }
});

// ── PATCH /:id/status ─────────────────────────────────────────────────────────
router.patch('/:id/status', requireClinicId, [
  param('id').isUUID(),
  body('status').isIn(['DRAFT','SENT','PAID','PARTIAL','OVERDUE','CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    const invoice = await Invoice.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!invoice) return res.status(404).json({ error: 'Facture non trouvée' });

    const oldStatus = invoice.status;
    await invoice.update({
      status: req.body.status,
      paid_at: req.body.status === 'PAID' ? new Date() : invoice.paid_at
    });

    res.json({ message: 'Statut mis à jour', invoice });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Erreur mise à jour statut', message: error.message });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!invoice) return res.status(404).json({ error: 'Facture non trouvée' });
    if (invoice.status !== 'DRAFT') return res.status(400).json({ error: 'Seules les factures brouillon peuvent être supprimées' });

    await InvoiceItem.destroy({ where: { invoice_id: invoice.id } });
    await invoice.destroy();
    res.json({ message: 'Facture supprimée' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Erreur suppression', message: error.message });
  }
});

// ── GET /:id/payments ─────────────────────────────────────────────────────────
router.get('/:id/payments', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!invoice) return res.status(404).json({ error: 'Facture non trouvée' });

    const payments = await Payment.findAll({
      where: { invoice_id: invoice.id, status: 'COMPLETED' },
      order: [['payment_date','DESC']]
    });

    const paid_total_mga = payments.reduce((sum, p) => sum + parseFloat(p.amount_mga || 0), 0);
    const balance_mga    = parseFloat(invoice.total_mga) - paid_total_mga;
    const payment_status = balance_mga <= 0 ? 'PAID' : (paid_total_mga > 0 ? 'PARTIAL' : 'UNPAID');

    res.json({ invoice_id: invoice.id, total_mga: parseFloat(invoice.total_mga), paid_total_mga, balance_mga, payment_status, payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

// ── POST /:id/payments ────────────────────────────────────────────────────────
router.post('/:id/payments', requireClinicId, [
  param('id').isUUID(),
  body('amount_mga').isFloat({ min: 1 }),
  body('payment_method').isIn(['CASH','CHEQUE','CARD','MVOLA','ORANGE_MONEY','AIRTEL_MONEY','BANK_TRANSFER']),
  body('reference_number').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    const invoice = await Invoice.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!invoice) return res.status(404).json({ error: 'Facture non trouvée' });

    const existing     = await Payment.findAll({ where: { invoice_id: invoice.id, status: 'COMPLETED' } });
    const currentPaid  = existing.reduce((sum, p) => sum + parseFloat(p.amount_mga || 0), 0);
    const balance      = parseFloat(invoice.total_mga) - currentPaid;
    const { amount_mga, payment_method, reference_number, notes } = req.body;

    if (parseFloat(amount_mga) > balance) {
      return res.status(409).json({ error: 'OVERPAYMENT_NOT_ALLOWED', balance_mga: balance });
    }

    const paymentCount = await Payment.count();
    const payment = await Payment.create({
      invoice_id:           invoice.id,
      clinic_id:            invoice.clinic_id,
      payment_number:       `PAY-${String(paymentCount + 1).padStart(6, '0')}`,
      amount_mga:           parseFloat(amount_mga),
      payment_method, reference_number, notes,
      processed_by_user_id: req.user.id,
      status:               'COMPLETED'
    });

    const newPaid    = currentPaid + parseFloat(amount_mga);
    const newBalance = parseFloat(invoice.total_mga) - newPaid;
    const newStatus  = newBalance <= 0 ? 'PAID' : 'PARTIAL';
    await invoice.update({ status: newStatus, paid_at: newStatus === 'PAID' ? new Date() : invoice.paid_at });

    res.status(201).json({ message: 'Paiement enregistré', payment, paid_total_mga: newPaid, balance_mga: newBalance, payment_status: newStatus });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

// ── GET /:id/print ────────────────────────────────────────────────────────────
router.get('/:id/print', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, ...clinicWhere(req) },
      include: [
        { model: Patient,     as: 'patient', required: false },
        { model: InvoiceItem, as: 'items',   required: false }
      ]
    });
    if (!invoice) return res.status(404).json({ error: 'Facture non trouvée' });

    const clinic   = invoice.clinic_id ? await Clinic.findByPk(invoice.clinic_id) : null;
    const payments = await Payment.findAll({ where: { invoice_id: invoice.id, status: 'COMPLETED' }, order: [['payment_date','ASC']] });
    const paidTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount_mga || 0), 0);
    const balance   = parseFloat(invoice.total_mga) - paidTotal;

    const fmt    = (a) => new Intl.NumberFormat('fr-MG', { style: 'decimal' }).format(a || 0) + ' Ar';
    const fmtDt  = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
    const pmLabels = { CASH:'Espèces', CHEQUE:'Chèque', CARD:'Carte', MVOLA:'MVola', ORANGE_MONEY:'Orange Money', AIRTEL_MONEY:'Airtel Money', BANK_TRANSFER:'Virement' };

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${invoice.invoice_number}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.4;color:#333;padding:20px}
.header{display:flex;justify-content:space-between;margin-bottom:30px;border-bottom:2px solid #0F7E8A;padding-bottom:20px}
.clinic-info h1{font-size:22px;color:#0F7E8A;margin-bottom:5px}.invoice-meta{text-align:right}
.invoice-meta h2{font-size:26px;color:#333}.number{font-size:16px;color:#0F7E8A;font-weight:bold}
table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{padding:10px;text-align:left;border-bottom:1px solid #ddd}
th{background:#f8fafc;font-weight:600;color:#0F7E8A}.amount{text-align:right}
.totals{margin-left:auto;width:300px}.total-row{font-size:15px;font-weight:bold;background:#0F7E8A;color:white}
.footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;text-align:center;color:#666;font-size:10px}
@media print{body{padding:0}}</style></head><body>
<div class="header">
  <div class="clinic-info">
    <h1>${clinic?.name || 'Cabinet Dentaire'}</h1>
    <p>${clinic?.address || ''}</p><p>${clinic?.phone || ''}</p>${clinic?.email ? `<p>${clinic.email}</p>` : ''}
  </div>
  <div class="invoice-meta">
    <h2>FACTURE</h2><p class="number">${invoice.invoice_number}</p>
    <p>Date: ${fmtDt(invoice.invoice_date)}</p>
    <p style="display:inline-block;padding:4px 12px;border-radius:20px;font-weight:600;background:${balance<=0?'#d1fae5':paidTotal>0?'#fef3c7':'#fee2e2'};color:${balance<=0?'#065f46':paidTotal>0?'#92400e':'#991b1b'}">
      ${balance<=0?'PAYÉE':paidTotal>0?'PARTIEL':'IMPAYÉE'}
    </p>
  </div>
</div>
<div style="margin-bottom:20px"><strong>Patient:</strong> ${invoice.patient?.first_name||''} ${invoice.patient?.last_name||''} — ${invoice.patient?.phone_primary||''}</div>
<table><thead><tr><th>Description</th><th class="amount">Qté</th><th class="amount">Prix unit.</th><th class="amount">Total</th></tr></thead>
<tbody>${(invoice.items||[]).map(i=>`<tr><td>${i.description}${i.tooth_number?` (Dent ${i.tooth_number})`:''}</td><td class="amount">${i.quantity}</td><td class="amount">${fmt(i.unit_price_mga)}</td><td class="amount">${fmt(i.total_price_mga)}</td></tr>`).join('')}</tbody></table>
<div class="totals"><table>
  <tr><td>Sous-total</td><td class="amount">${fmt(invoice.subtotal_mga)}</td></tr>
  ${invoice.discount_percentage>0?`<tr><td>Remise (${invoice.discount_percentage}%)</td><td class="amount">-${fmt(invoice.discount_amount_mga)}</td></tr>`:''}
  <tr class="total-row"><td>Total</td><td class="amount">${fmt(invoice.total_mga)}</td></tr>
  <tr><td>Payé</td><td class="amount">${fmt(paidTotal)}</td></tr>
  <tr style="background:${balance>0?'#fef3c7':'#d1fae5'}"><td><strong>Reste</strong></td><td class="amount"><strong>${fmt(balance)}</strong></td></tr>
</table></div>
${payments.length>0?`<div class="payments" style="margin-top:20px"><h3 style="color:#0F7E8A;margin-bottom:10px">Paiements</h3><table><thead><tr><th>Date</th><th>Méthode</th><th>Référence</th><th class="amount">Montant</th></tr></thead><tbody>${payments.map(p=>`<tr><td>${fmtDt(p.payment_date)}</td><td>${pmLabels[p.payment_method]||p.payment_method}</td><td>${p.reference_number||'-'}</td><td class="amount">${fmt(p.amount_mga)}</td></tr>`).join('')}</tbody></table></div>`:''}
${invoice.notes?`<p style="margin-top:20px;color:#666"><em>Notes: ${invoice.notes}</em></p>`:''}
<div class="footer"><p>Merci de votre confiance</p></div>
<script>if(window.opener){window.print();}</script>
</body></html>`;

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Print invoice error:', error);
    res.status(500).json({ error: 'Erreur impression', message: error.message });
  }
});

// ── GET /:id/pdf ──────────────────────────────────────────────────────────────
router.get('/:id/pdf', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const { generateInvoicePDF } = require('../utils/pdfGenerator');
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, ...clinicWhere(req) },
      include: [
        { model: Patient,     as: 'patient', required: false },
        { model: InvoiceItem, as: 'items',   required: false }
      ]
    });
    if (!invoice) return res.status(404).json({ error: 'Facture non trouvée' });

    const clinic   = invoice.clinic_id ? await Clinic.findByPk(invoice.clinic_id) : null;
    const payments = await Payment.findAll({ where: { invoice_id: invoice.id, status: 'COMPLETED' } });
    const pdfBuffer = await generateInvoicePDF(invoice, clinic, payments);

    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF invoice error:', error);
    res.status(500).json({ error: 'Erreur PDF', message: error.message });
  }
});

module.exports = router;
