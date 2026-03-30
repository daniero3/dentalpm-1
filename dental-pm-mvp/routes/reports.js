const express = require('express');
const { query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Invoice, Payment, Patient } = require('../models');

const jwt = require('jsonwebtoken');
const _getClinicId = (req) => {
  const v = req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id;
  if (v) return v;
  try { const t = req.headers?.authorization?.split(' ')[1]; return t ? jwt.verify(t, process.env.JWT_SECRET).clinic_id : null; } catch(e) { return null; }
};
const _getUserId = (req) => {
  const v = req.user?.id || req.user?.dataValues?.id || req.user?.userId;
  if (v) return v;
  try { const t = req.headers?.authorization?.split(' ')[1]; return t ? jwt.verify(t, process.env.JWT_SECRET).userId : null; } catch(e) { return null; }
};

const router = express.Router();

// ✅ Pas de requireValidSubscription ni requireClinicId bloquant
const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;

// ── GET /finance ──────────────────────────────────────────────────────────────
router.get('/finance', [
  query('from').optional().isDate(),
  query('to').optional().isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Dates invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const fromDate = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate   = req.query.to   ? new Date(req.query.to)   : new Date();
    toDate.setHours(23, 59, 59, 999);

    const invoiceWhere = { created_at: { [Op.between]: [fromDate, toDate] } };
    if (clinicId) invoiceWhere.clinic_id = clinicId;
    // Essayer document_type si la colonne existe
    try { invoiceWhere.document_type = 'INVOICE'; } catch(e) {}

    let invoices = [];
    try {
      invoices = await Invoice.findAll({
        where: invoiceWhere,
        attributes: ['id','invoice_number','total_mga','status','created_at'],
        include: [{ model: Patient, as: 'patient', attributes: ['id','first_name','last_name'], required: false }],
        order: [['created_at','DESC']]
      });
    } catch(e) {
      // Si document_type n'existe pas, retirer ce filtre
      delete invoiceWhere.document_type;
      invoices = await Invoice.findAll({
        where: invoiceWhere,
        attributes: ['id','invoice_number','total_mga','status','created_at'],
        include: [{ model: Patient, as: 'patient', attributes: ['id','first_name','last_name'], required: false }],
        order: [['created_at','DESC']]
      });
    }

    const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_mga || 0), 0);

    const paymentWhere = { payment_date: { [Op.between]: [fromDate, toDate] } };
    if (clinicId) paymentWhere.clinic_id = clinicId;

    const payments = await Payment.findAll({
      where: paymentWhere,
      attributes: ['id','invoice_id','amount_mga','payment_method']
    });

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount_mga || 0), 0);
    const balance   = totalInvoiced - totalPaid;

    // Breakdown par méthode
    const methodBreakdown = {};
    payments.forEach(p => {
      const method = p.payment_method || 'OTHER';
      if (!methodBreakdown[method]) methodBreakdown[method] = { count:0, total_mga:0 };
      methodBreakdown[method].count++;
      methodBreakdown[method].total_mga += parseFloat(p.amount_mga || 0);
    });

    // Paiements par facture
    const invoicePayments = {};
    payments.forEach(p => {
      invoicePayments[p.invoice_id] = (invoicePayments[p.invoice_id] || 0) + parseFloat(p.amount_mga || 0);
    });

    // Top impayées
    const unpaidInvoices = invoices
      .map(inv => {
        const paid      = invoicePayments[inv.id] || 0;
        const remaining = parseFloat(inv.total_mga || 0) - paid;
        return { id: inv.id, invoice_number: inv.invoice_number, patient_name: inv.patient ? `${inv.patient.first_name} ${inv.patient.last_name}` : 'N/A', total_mga: parseFloat(inv.total_mga || 0), paid_mga: paid, remaining_mga: remaining, status: inv.status, created_at: inv.created_at };
      })
      .filter(inv => inv.remaining_mga > 0)
      .sort((a, b) => b.remaining_mga - a.remaining_mga)
      .slice(0, 20);

    res.json({
      period: { from: fromDate.toISOString().split('T')[0], to: toDate.toISOString().split('T')[0] },
      totals: { invoiced_mga: totalInvoiced, paid_mga: totalPaid, balance_mga: balance },
      breakdown_by_method: methodBreakdown,
      top_unpaid_invoices: unpaidInvoices,
      stats: {
        invoice_count: invoices.length,
        payment_count: payments.length,
        unpaid_count: unpaidInvoices.length,
        fully_paid_count: invoices.length - unpaidInvoices.length,
        collection_rate: totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Finance report error:', error);
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

module.exports = router;
