const express = require('express');
const { query, validationResult } = require('express-validator');
const { Op, fn, col, literal } = require('sequelize');
const { Invoice, Payment, Patient, sequelize } = require('../models');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');

const router = express.Router();

router.use(requireValidSubscription);

/**
 * GET /api/reports/finance
 * Financial report with totals, breakdown by payment method, and top unpaid invoices
 */
router.get('/finance', requireClinicId, [
  query('from').optional().isDate(),
  query('to').optional().isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Dates invalides', details: errors.array() });
    }

    const clinicId = req.clinic_id;
    const fromDate = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = req.query.to ? new Date(req.query.to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    // Get all invoices in period (only actual invoices, not quotes)
    const invoices = await Invoice.findAll({
      where: {
        clinic_id: clinicId,
        document_type: 'INVOICE',
        created_at: { [Op.between]: [fromDate, toDate] }
      },
      attributes: ['id', 'invoice_number', 'total_mga', 'status', 'created_at'],
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Calculate totals
    const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_mga || 0), 0);

    // Get all payments in period for this clinic's invoices
    const payments = await Payment.findAll({
      where: {
        clinic_id: clinicId,
        payment_date: { [Op.between]: [fromDate, toDate] }
      },
      attributes: ['id', 'invoice_id', 'amount_mga', 'payment_method']
    });

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount_mga || 0), 0);
    const balance = totalInvoiced - totalPaid;

    // Breakdown by payment method
    const methodBreakdown = {};
    payments.forEach(p => {
      const method = p.payment_method || 'OTHER';
      if (!methodBreakdown[method]) {
        methodBreakdown[method] = { count: 0, total_mga: 0 };
      }
      methodBreakdown[method].count++;
      methodBreakdown[method].total_mga += parseFloat(p.amount_mga || 0);
    });

    // Calculate paid amount per invoice
    const invoicePayments = {};
    payments.forEach(p => {
      if (!invoicePayments[p.invoice_id]) {
        invoicePayments[p.invoice_id] = 0;
      }
      invoicePayments[p.invoice_id] += parseFloat(p.amount_mga || 0);
    });

    // Top unpaid invoices
    const unpaidInvoices = invoices
      .map(inv => {
        const paid = invoicePayments[inv.id] || 0;
        const remaining = parseFloat(inv.total_mga || 0) - paid;
        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          patient_name: inv.patient ? `${inv.patient.first_name} ${inv.patient.last_name}` : 'N/A',
          total_mga: parseFloat(inv.total_mga || 0),
          paid_mga: paid,
          remaining_mga: remaining,
          status: inv.status,
          created_at: inv.created_at
        };
      })
      .filter(inv => inv.remaining_mga > 0)
      .sort((a, b) => b.remaining_mga - a.remaining_mga)
      .slice(0, 20);

    // Summary stats
    const stats = {
      invoice_count: invoices.length,
      payment_count: payments.length,
      unpaid_count: unpaidInvoices.length,
      fully_paid_count: invoices.length - unpaidInvoices.length,
      collection_rate: totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : 0
    };

    res.json({
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0]
      },
      totals: {
        invoiced_mga: totalInvoiced,
        paid_mga: totalPaid,
        balance_mga: balance
      },
      breakdown_by_method: methodBreakdown,
      top_unpaid_invoices: unpaidInvoices,
      stats
    });
  } catch (error) {
    console.error('Finance report error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;
