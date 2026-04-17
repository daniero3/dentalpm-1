const express = require('express');
const { Op } = require('sequelize');
const { Patient, Invoice, Appointment, Payment, Treatment } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper — récupère clinic_id depuis req (injecté par authenticateToken)
const getClinicId = (req) =>
  req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;

// ── GET /api/dashboard/kpi ────────────────────────────────────────────────────
router.get('/kpi', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    if (!clinicId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cabinet non identifié', code: 'NO_CLINIC' });
    }
    const today        = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear  = new Date(today.getFullYear(), 0, 1);
    const last30       = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Filtre de base par cabinet
    const cWhere = clinicId ? { clinic_id: clinicId } : {};

    const totalPatients = await Patient.count({
      where: { is_active: true, ...cWhere }
    });

    const totalInvoices = await Invoice.count({ where: { ...cWhere } });

    const pendingInvoices = await Invoice.count({
      where: { status: { [Op.in]: ['DRAFT', 'SENT', 'PARTIAL'] }, ...cWhere }
    });

    const totalRevenue = await Invoice.sum('total_mga', {
      where: { status: 'PAID', ...cWhere }
    }) || 0;

    const monthlyRevenue = await Invoice.sum('total_mga', {
      where: { status: 'PAID', invoice_date: { [Op.gte]: startOfMonth }, ...cWhere }
    }) || 0;

    const yearlyRevenue = await Invoice.sum('total_mga', {
      where: { status: 'PAID', invoice_date: { [Op.gte]: startOfYear }, ...cWhere }
    }) || 0;

    const outstandingAmount = await Invoice.sum('total_mga', {
      where: { status: { [Op.in]: ['SENT', 'PARTIAL', 'OVERDUE'] }, ...cWhere }
    }) || 0;

    const monthlyAppointments = await Appointment.count({
      where: { appointment_date: { [Op.gte]: startOfMonth }, ...cWhere }
    });

    const todayAppts = await Appointment.count({
      where: { appointment_date: today.toISOString().split('T')[0], ...cWhere }
    });

    const monthlyTreatments = await Treatment.count({
      where: { status: 'COMPLETED', treatment_date: { [Op.gte]: startOfMonth }, ...cWhere }
    }).catch(() => 0);

    const completedTreatments = await Treatment.count({
      where: { status: 'COMPLETED', ...cWhere }
    }).catch(() => 0);

    const recentPatients = await Patient.count({
      where: { created_at: { [Op.gte]: last30 }, ...cWhere }
    });

    const monthlyInvoices = await Invoice.count({
      where: { invoice_date: { [Op.gte]: startOfMonth }, ...cWhere }
    });

    res.json({
      clinic_id: clinicId,
      patients:     { total: totalPatients, recent: recentPatients, growth_rate: 0 },
      invoices:     { total: totalInvoices, pending: pendingInvoices, monthly: monthlyInvoices },
      revenue:      { total: totalRevenue, monthly: monthlyRevenue, yearly: yearlyRevenue, outstanding: outstandingAmount, currency: 'MGA' },
      appointments: { monthly: monthlyAppointments, today: todayAppts },
      treatments:   { monthly: monthlyTreatments, completed: completedTreatments },
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard KPI error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des KPIs' });
  }
});

// ── GET /api/dashboard/recent-activities ─────────────────────────────────────
router.get('/recent-activities', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const cWhere   = clinicId ? { clinic_id: clinicId } : {};

    const recentPatients = await Patient.findAll({
      where: { ...cWhere },
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'first_name', 'last_name', 'created_at']
    });

    const recentInvoices = await Invoice.findAll({
      where: { ...cWhere },
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [{ model: Patient, as: 'patient', attributes: ['first_name', 'last_name'] }],
      attributes: ['id', 'invoice_number', 'total_mga', 'status', 'created_at']
    });

    const recentAppointments = await Appointment.findAll({
      where: { ...cWhere },
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [{ model: Patient, as: 'patient', attributes: ['first_name', 'last_name'] }],
      attributes: ['id', 'appointment_date', 'start_time', 'status', 'created_at']
    });

    const recentPayments = await Payment.findAll({
      where: { ...cWhere },
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [{
        model: Invoice, as: 'invoice',
        include: [{ model: Patient, as: 'patient', attributes: ['first_name', 'last_name'] }]
      }],
      attributes: ['id', 'amount_mga', 'payment_method', 'payment_date']
    }).catch(() => []);

    res.json({
      clinic_id: clinicId,
      recent_patients:     recentPatients,
      recent_invoices:     recentInvoices,
      recent_appointments: recentAppointments,
      recent_payments:     recentPayments
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des activités récentes' });
  }
});

// ── GET /api/dashboard/revenue-chart ─────────────────────────────────────────
router.get('/revenue-chart', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const cWhere   = clinicId ? { clinic_id: clinicId } : {};
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;

    const startDate = new Date(year, 0, 1);
    const endDate   = new Date(year, 11, 31);

    const revenueData = await Invoice.findAll({
      where: {
        status: 'PAID',
        invoice_date: { [Op.between]: [startDate, endDate] },
        ...cWhere
      },
      attributes: ['invoice_date', 'total_mga'],
      order: [['invoice_date', 'ASC']]
    });

    const groupedData = {};
    revenueData.forEach(invoice => {
      const date = new Date(invoice.invoice_date);
      let key;
      if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'weekly') {
        const week = Math.ceil(date.getDate() / 7);
        key = `${date.getFullYear()}-${String(week).padStart(2, '0')}`;
      } else {
        key = invoice.invoice_date;
      }
      groupedData[key] = (groupedData[key] || 0) + parseFloat(invoice.total_mga);
    });

    const chartData = Object.entries(groupedData).map(([p, amount]) => ({
      period: p,
      amount,
      formatted_amount: new Intl.NumberFormat('fr-MG').format(amount) + ' MGA'
    }));

    res.json({
      clinic_id: clinicId,
      period,
      year:  parseInt(year),
      data:  chartData,
      total: chartData.reduce((sum, item) => sum + item.amount, 0),
      currency: 'MGA'
    });
  } catch (error) {
    console.error('Revenue chart error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données de revenus' });
  }
});

module.exports = router;
