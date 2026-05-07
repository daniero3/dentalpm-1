const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Invoice, InvoiceItem, Patient, Payment, AuditLog, PricingSchedule, Clinic, User, sequelize } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');
const { requirePermission } = require('../utils/permissions');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

// Lire userId depuis JWT token directement
const getUserIdFromToken = (req) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.userId || decoded.id || null;
    }
  } catch(e) {}
  return null;
};

const router = express.Router();

// ✅ Pas de requireValidSubscription — géré par licensing.js global
router.use(auditLogger('invoices'));

const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;

// Décoder le token JWT directement pour obtenir userId de façon fiable
const getUserId = (req) => {
  // 1. Depuis req.user Sequelize
  if (req.user?.id)             return (req.user?.id || req.user?.dataValues?.id);
  if (req.user?.dataValues?.id) return req.user.dataValues.id;
  if (req.user?.userId)         return req.user.userId;

  // 2. Décoder directement depuis le header Authorization
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      const parts  = token.split('.');
      const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (decoded?.userId) return decoded.userId;
      if (decoded?.id)     return decoded.id;
    }
  } catch(e) {}

  return null;
};
const clinicWhere = (req, extra = {}) => {
  // SUPER_ADMIN bloqué par middleware - ne peut pas voir les factures patients
  const clinicId = getClinicId(req);
  if (clinicId) return { clinic_id: clinicId, ...extra };
  return extra;
};

const getNextInvoiceNumber = async (transaction) => {
  const year = new Date().getFullYear();
  const prefix = `FACT-${year}-`;

  const lastInvoice = await Invoice.findOne({
    where: { invoice_number: { [Op.like]: `${prefix}%` } },
    order: [['invoice_number', 'DESC']],
    attributes: ['invoice_number'],
    transaction
  });

  let nextNum = 1;
  if (lastInvoice?.invoice_number) {
    nextNum = (parseInt(lastInvoice.invoice_number.replace(prefix, ''), 10) || 0) + 1;
  }

  let candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
  while (await Invoice.findOne({ where: { invoice_number: candidate }, transaction })) {
    nextNum += 1;
    candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  return candidate;
};

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', [
  query('page').optional().isInt({ min:1 }),
  query('limit').optional().isInt({ min:1, max:100 }),
  query('status').optional().isIn(['DRAFT','SENT','PAID','PARTIAL','OVERDUE','CANCELLED'])
], async (req, res) => {
  try {
    const { page=1, limit=20, status, patient_id } = req.query;
    const offset = (page - 1) * limit;
    const where  = clinicWhere(req);
    if (status)     where.status     = status;
    if (patient_id) where.patient_id = patient_id;

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where,
      include: [
        { model: Patient,     as: 'patient', attributes: ['id','first_name','last_name','phone_primary'], required: false },
        { model: InvoiceItem, as: 'items',   required: false }
      ],
      limit: parseInt(limit), offset: parseInt(offset),
      order: [['created_at','DESC']]
    });

    res.json({ invoices, pagination: { current_page: parseInt(page), total_pages: Math.ceil(count/limit), total_count: count, per_page: parseInt(limit) } });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error:'Erreur serveur', message: error.message });
  }
});

// ── GET /revenues — Toutes les recettes encaissées du cabinet ───────────────
router.get('/revenues', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where = { status: 'COMPLETED' };
    if (clinicId) where.clinic_id = clinicId;

    const payments = await Payment.findAll({
      where,
      include: [{
        model: Invoice,
        as: 'invoice',
        attributes: ['id','invoice_number','patient_id','total_mga','status'],
        required: false,
        include: [{ model: Patient, as: 'patient', attributes: ['id','first_name','last_name'], required: false }]
      }],
      order: [['payment_date','DESC'], ['created_at','DESC']],
      limit: 200
    });

    const revenues = payments.map(p => ({
      id: p.id,
      payment_number: p.payment_number,
      payment_date: p.payment_date,
      amount_mga: parseFloat(p.amount_mga || 0),
      payment_method: p.payment_method,
      reference_number: p.reference_number,
      invoice_number: p.invoice?.invoice_number || null,
      invoice_id: p.invoice_id,
      patient_name: p.invoice?.patient ? `${p.invoice.patient.first_name} ${p.invoice.patient.last_name}` : 'N/A'
    }));

    res.json({
      revenues,
      total_mga: revenues.reduce((sum, r) => sum + r.amount_mga, 0),
      count: revenues.length
    });
  } catch (error) {
    console.error('Get revenues error:', error);
    res.status(500).json({ error:'Erreur serveur', message: error.message });
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, ...clinicWhere(req) },
      include: [
        { model: Patient,     as: 'patient', required: false },
        { model: InvoiceItem, as: 'items',   required: false },
        { model: Payment,     as: 'payments', required: false }
      ]
    });
    if (!invoice) return res.status(404).json({ error:'Facture non trouvée' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', message: error.message });
  }
});

// ── POST / ────────────────────────────────────────────────────────────────────
router.post('/', [
  body('patient_id').isUUID(),
  body('items').isArray({ min:1 }),
  body('items.*.description').isLength({ min:1, max:255 }),
  body('items.*.quantity').isInt({ min:1 }),
  body('items.*.unit_price_mga').isFloat({ min:0 }),
  body('discount_percentage').optional().isFloat({ min:0, max:100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const { patient_id, schedule_id, items, discount_percentage=0, notes } = req.body;
    const clinicId = getClinicId(req);
    if (!clinicId) return res.status(403).json({ error: 'Cabinet non identifié', code: 'NO_CLINIC' });

    const patient = await Patient.findOne({ where: { id: patient_id, clinic_id: clinicId } });
    if (!patient) return res.status(404).json({ error:'Patient non trouvé' });

    if (schedule_id) {
      const schedule = await PricingSchedule.findOne({
        where: {
          id: schedule_id,
          is_active: true,
          [Op.or]: [
            { clinic_id: clinicId },
            { clinic_id: null, type: 'SYNDICAL' }
          ]
        }
      });
      if (!schedule) return res.status(404).json({ error:'Grille tarifaire non trouvée' });
    }

    const subtotal       = items.reduce((sum, i) => sum + (i.quantity * i.unit_price_mga), 0);
    const discountAmount = (subtotal * discount_percentage) / 100;
    const total          = subtotal - discountAmount;
    let finalUserId = getUserIdFromToken(req);

    if (!finalUserId && req.user?.username) {
      try {
        const u = await User.findOne({ where: { username: req.user.username }, attributes: ['id'] });
        finalUserId = u?.id || null;
      } catch(e) {}
    }

    const complete = await sequelize.transaction(async (transaction) => {
      const invoiceNumber = await getNextInvoiceNumber(transaction);

      const baseInvoice = {
        invoice_number:      invoiceNumber,
        patient_id,
        clinic_id:           clinicId,
        subtotal_mga:        subtotal,
        discount_percentage: discount_percentage || 0,
        discount_amount_mga: discountAmount,
        total_mga:           total,
        status:              'DRAFT',
      };
      if (schedule_id)  baseInvoice.schedule_id = schedule_id;
      if (notes)        baseInvoice.notes = notes;
      if (finalUserId)  baseInvoice.created_by_user_id = finalUserId;

      let invoice;
      try {
        invoice = await Invoice.create({ ...baseInvoice, document_type: 'INVOICE' }, { transaction });
      } catch(e1) {
        if (e1.message?.includes('document_type') || e1.message?.includes('column')) {
          invoice = await Invoice.create(baseInvoice, { transaction });
        } else {
          throw e1;
        }
      }

      await Promise.all(items.map(item => InvoiceItem.create({
        invoice_id:      invoice.id,
        description:     item.description,
        quantity:        item.quantity,
        unit_price_mga:  item.unit_price_mga,
        total_price_mga: item.quantity * item.unit_price_mga,
        procedure_id:    item.procedure_id || null,
        tooth_number:    item.tooth_number || null,
        notes:           item.notes || null
      }, { transaction })));

      try {
        await AuditLog.create({
          user_id: finalUserId,
          action:'CREATE',
          resource_type:'invoices',
          resource_id: invoice.id,
          ip_address: req.ip,
          description:`Facture créée: ${invoiceNumber}`
        }, { transaction });
      } catch(e) {}

      return Invoice.findByPk(invoice.id, {
        include: [
          { model: Patient,     as: 'patient', attributes: ['id','first_name','last_name','phone_primary'], required: false },
          { model: InvoiceItem, as: 'items',   required: false }
        ],
        transaction
      });
    });

    res.status(201).json({ message:'Facture créée', invoice: complete });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error:'Erreur serveur', message: error.message });
  }
});

// ── PATCH /:id/status ─────────────────────────────────────────────────────────
router.patch('/:id/status', [
  param('id').isUUID(),
  body('status').isIn(['DRAFT','SENT','PAID','PARTIAL','OVERDUE','CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const invoice = await Invoice.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!invoice) return res.status(404).json({ error:'Facture non trouvée' });

    await invoice.update({ status: req.body.status, paid_at: req.body.status === 'PAID' ? new Date() : invoice.paid_at });
    res.json({ message:'Statut mis à jour', invoice });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', message: error.message });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!invoice) return res.status(404).json({ error:'Facture non trouvée' });
    if (invoice.status !== 'DRAFT') return res.status(400).json({ error:'Seules les factures brouillon peuvent être supprimées' });
    await InvoiceItem.destroy({ where: { invoice_id: invoice.id } });
    await invoice.destroy();
    res.json({ message:'Facture supprimée' });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', message: error.message });
  }
});

// ── GET /:id/payments ─────────────────────────────────────────────────────────
router.get('/:id/payments', requirePermission('payments', 'read'), [param('id').isUUID()], async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!invoice) return res.status(404).json({ error:'Facture non trouvée' });

    const payments   = await Payment.findAll({ where: { invoice_id: invoice.id, status:'COMPLETED' }, order: [['payment_date','DESC']] });
    const paid_total = payments.reduce((sum, p) => sum + parseFloat(p.amount_mga||0), 0);
    const balance    = parseFloat(invoice.total_mga) - paid_total;

    res.json({ invoice_id: invoice.id, total_mga: parseFloat(invoice.total_mga), paid_total_mga: paid_total, balance_mga: balance, payment_status: balance<=0?'PAID':paid_total>0?'PARTIAL':'UNPAID', payments });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', message: error.message });
  }
});

// ── POST /:id/payments ────────────────────────────────────────────────────────
router.post('/:id/payments', requirePermission('payments', 'execute'), [
  param('id').isUUID(),
  body('amount_mga').isFloat({ min:1 }),
  body('payment_method').isIn(['CASH','CHEQUE','CARD','MVOLA','ORANGE_MONEY','AIRTEL_MONEY','BANK_TRANSFER'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const invoice = await Invoice.findOne({ where: { id: req.params.id, ...clinicWhere(req) } });
    if (!invoice) return res.status(404).json({ error:'Facture non trouvée' });

    const existing   = await Payment.findAll({ where: { invoice_id: invoice.id, status:'COMPLETED' } });
    const currentPaid = existing.reduce((sum, p) => sum + parseFloat(p.amount_mga||0), 0);
    const balance    = parseFloat(invoice.total_mga) - currentPaid;
    const { amount_mga, payment_method, reference_number, notes } = req.body;

    const balanceRounded = Math.round(balance);
    const amountRounded  = Math.round(parseFloat(amount_mga));

    if (amountRounded > balanceRounded + 1) { // +1 tolérance arrondi
      return res.status(409).json({
        error: 'Montant supérieur au solde restant',
        code: 'OVERPAYMENT_NOT_ALLOWED',
        balance_mga: balanceRounded,
        message: `Le solde restant est de ${new Intl.NumberFormat('fr-MG').format(balanceRounded)} Ar`
      });
    }

    // Générer payment_number unique (MAX au lieu de COUNT pour éviter doublons)
    const prefix = 'PAY-';
    const lastPay = await Payment.findOne({
      where: { payment_number: { [Op.like]: `${prefix}%` } },
      order: [['payment_number', 'DESC']],
      attributes: ['payment_number']
    }).catch(() => null);
    let nextNum = 1;
    if (lastPay?.payment_number) {
      nextNum = (parseInt(lastPay.payment_number.replace(prefix, '')) || 0) + 1;
    }
    let paymentNumber = `${prefix}${String(nextNum).padStart(6,'0')}`;
    while (await Payment.findOne({ where: { payment_number: paymentNumber } }).catch(()=>null)) {
      nextNum++;
      paymentNumber = `${prefix}${String(nextNum).padStart(6,'0')}`;
    }

    const payment = await Payment.create({
      invoice_id:           invoice.id,
      clinic_id:            invoice.clinic_id,
      payment_number:       paymentNumber,
      amount_mga:           parseFloat(amount_mga),
      payment_method, reference_number, notes,
      processed_by_user_id: getUserIdFromToken(req),
      status:               'COMPLETED'
    });

    const newPaid   = currentPaid + parseFloat(amount_mga);
    const newBalance = parseFloat(invoice.total_mga) - newPaid;
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';
    await invoice.update({ status: newStatus, paid_at: newStatus==='PAID' ? new Date() : invoice.paid_at });

    res.status(201).json({ message:'Paiement enregistré', payment, paid_total_mga: newPaid, balance_mga: newBalance, payment_status: newStatus });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', message: error.message });
  }
});

// ── GET /:id/print ────────────────────────────────────────────────────────────
router.get('/:id/print', [param('id').isUUID()], async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, ...clinicWhere(req) },
      include: [
        { model: Patient,     as: 'patient', required: false },
        { model: InvoiceItem, as: 'items',   required: false }
      ]
    });
    if (!invoice) return res.status(404).json({ error:'Facture non trouvée' });

    let clinic = null;
    try { if (invoice.clinic_id) clinic = await Clinic.findByPk(invoice.clinic_id); } catch(e) {}
    const payments  = await Payment.findAll({ where: { invoice_id: invoice.id, status:'COMPLETED' }, order: [['payment_date','ASC']] });
    const paidTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount_mga||0), 0);
    const balance   = parseFloat(invoice.total_mga) - paidTotal;

    const fmt   = (a) => new Intl.NumberFormat('fr-MG').format(a||0) + ' Ar';
    const fmtDt = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
    const esc   = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
    const pmLabels = { CASH:'Espèces', CHEQUE:'Chèque', CARD:'Carte', MVOLA:'MVola', ORANGE_MONEY:'Orange Money', AIRTEL_MONEY:'Airtel Money', BANK_TRANSFER:'Virement' };

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${esc(invoice.invoice_number)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#333;padding:20px}
.header{display:flex;justify-content:space-between;margin-bottom:24px;border-bottom:2px solid #0D7A87;padding-bottom:16px}
.clinic h1{font-size:20px;color:#0D7A87}table{width:100%;border-collapse:collapse;margin-bottom:16px}
th,td{padding:8px;text-align:left;border-bottom:1px solid #eee}th{background:#f8fafc;color:#0D7A87}
.amount{text-align:right}.totals{margin-left:auto;width:280px}
.total-row{background:#0D7A87;color:white}@media print{body{padding:0}}</style></head><body>
<div class="header">
  <div class="clinic"><h1>${esc(clinic?.name||'Cabinet Dentaire')}</h1><p>${esc(clinic?.address||'')}</p><p>${esc(clinic?.phone||'')}</p></div>
  <div style="text-align:right"><h2 style="font-size:24px">FACTURE</h2><p style="color:#0D7A87;font-weight:bold">${esc(invoice.invoice_number)}</p><p>${esc(fmtDt(invoice.created_at))}</p></div>
</div>
<div style="background:#f8fafc;padding:10px;border-radius:6px;margin-bottom:16px">
  <strong>Patient:</strong> ${esc(invoice.patient?.first_name||'')} ${esc(invoice.patient?.last_name||'')} - ${esc(invoice.patient?.phone_primary||'')}
</div>
<table><thead><tr><th>Description</th><th class="amount">Qté</th><th class="amount">Prix unit.</th><th class="amount">Total</th></tr></thead>
<tbody>${(invoice.items||[]).map(i=>`<tr><td>${esc(i.description)}${i.tooth_number?` (Dent ${esc(i.tooth_number)})`:''}</td><td class="amount">${esc(i.quantity)}</td><td class="amount">${esc(fmt(i.unit_price_mga))}</td><td class="amount">${esc(fmt(i.total_price_mga))}</td></tr>`).join('')}</tbody></table>
<div class="totals"><table>
  <tr><td>Sous-total</td><td class="amount">${esc(fmt(invoice.subtotal_mga))}</td></tr>
  ${invoice.discount_percentage>0?`<tr><td>Remise (${esc(invoice.discount_percentage)}%)</td><td class="amount">-${esc(fmt(invoice.discount_amount_mga))}</td></tr>`:''}
  <tr class="total-row"><td><strong>TOTAL</strong></td><td class="amount"><strong>${esc(fmt(invoice.total_mga))}</strong></td></tr>
  <tr><td>Payé</td><td class="amount">${esc(fmt(paidTotal))}</td></tr>
  <tr style="background:${balance>0?'#fef3c7':'#d1fae5'}"><td><strong>Reste</strong></td><td class="amount"><strong>${esc(fmt(balance))}</strong></td></tr>
</table></div>
${payments.length>0?`<div style="margin-top:16px"><h3 style="color:#0D7A87;margin-bottom:8px">Paiements</h3><table><thead><tr><th>Date</th><th>Méthode</th><th class="amount">Montant</th></tr></thead><tbody>${payments.map(p=>`<tr><td>${esc(fmtDt(p.payment_date))}</td><td>${esc(pmLabels[p.payment_method]||p.payment_method)}</td><td class="amount">${esc(fmt(p.amount_mga))}</td></tr>`).join('')}</tbody></table></div>`:''}
${invoice.notes?`<p style="margin-top:16px;color:#666;font-style:italic">Notes: ${esc(invoice.notes)}</p>`:''}
<div style="margin-top:30px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #eee;padding-top:16px">
  <div style="text-align:center">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent('DPM-FACT:'+invoice.invoice_number+' | Montant:'+invoice.total_mga+' Ar | Date:'+new Date(invoice.invoice_date||invoice.created_at).toLocaleDateString('fr-FR'))}" 
         alt="QR" style="width:90px;height:90px;border:1px solid #eee;border-radius:6px;padding:4px"/>
    <div style="font-size:9px;color:#999;margin-top:3px">${esc(invoice.invoice_number)}</div>
    <div style="font-size:8px;color:#bbb">DPM Madagascar</div>
  </div>
  <div style="text-align:center;color:#666;font-size:11px">
    <div>Merci de votre confiance</div>
    <div style="margin-top:4px;font-size:9px;color:#bbb">DentalPM Madagascar — dentalpracticemada.com</div>
  </div>
</div>
<script>if(window.opener||window.print)window.print();</script>
</body></html>`;

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', message: error.message });
  }
});


// ── GET /:id/pdf (alias de print) ────────────────────────────────────────────
router.get('/:id/pdf', [param('id').isUUID()], async (req, res) => {
  // Rediriger vers print
  req.url = req.url.replace('/pdf', '/print');
  return router.handle(req, res, () => {});
});

module.exports = router;
