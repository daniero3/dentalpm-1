const express = require('express');
const { Op } = require('sequelize');
const { Patient, Invoice, Appointment, Payment, Treatment } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get dashboard KPIs
router.get('/kpi', async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Basic counts
    const totalPatients = await Patient.count({
      where: { is_active: true }
    });

    const totalInvoices = await Invoice.count();
    
    const pendingInvoices = await Invoice.count({
      where: { 
        status: {
          [Op.in]: ['DRAFT', 'SENT', 'PARTIAL']
        }
      }
    });

    // Revenue calculations
    const totalRevenue = await Invoice.sum('total_mga', {
      where: { status: 'PAID' }
    }) || 0;

    const monthlyRevenue = await Invoice.sum('total_mga', {
      where: {
        status: 'PAID',
        invoice_date: {
          [Op.gte]: startOfMonth
        }
      }
    }) || 0;

    const yearlyRevenue = await Invoice.sum('total_mga', {
      where: {
        status: 'PAID',
        invoice_date: {
          [Op.gte]: startOfYear
        }
      }
    }) || 0;

    // Outstanding amount
    const outstandingAmount = await Invoice.sum('total_mga', {
      where: {
        status: {
          [Op.in]: ['SENT', 'PARTIAL', 'OVERDUE']
        }
      }
    }) || 0;

    // Appointments this month
    const monthlyAppointments = await Appointment.count({
      where: {
        appointment_date: {
          [Op.gte]: startOfMonth
        }
      }
    });

    // Completed treatments this month
    const monthlyTreatments = await Treatment.count({
      where: {
        status: 'COMPLETED',
        treatment_date: {
          [Op.gte]: startOfMonth
        }
      }
    });

    // Recent patients (last 30 days)
    const recentPatients = await Patient.count({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    res.json({
      patients: {
        total: totalPatients,
        recent: recentPatients,
        growth_rate: 0 // Could calculate based on historical data
      },
      invoices: {
        total: totalInvoices,
        pending: pendingInvoices,
        monthly: await Invoice.count({
          where: {
            invoice_date: {
              [Op.gte]: startOfMonth
            }
          }
        })
      },
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
        yearly: yearlyRevenue,
        outstanding: outstandingAmount,
        currency: 'MGA'
      },
      appointments: {
        monthly: monthlyAppointments,
        today: await Appointment.count({
          where: {
            appointment_date: today.toISOString().split('T')[0]
          }
        })
      },
      treatments: {
        monthly: monthlyTreatments,
        completed: await Treatment.count({
          where: { status: 'COMPLETED' }
        })
      },
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard KPI error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des KPIs'
    });
  }
});

// Get recent activities
router.get('/recent-activities', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Recent patients
    const recentPatients = await Patient.findAll({
      limit: 3,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'first_name', 'last_name', 'created_at']
    });

    // Recent invoices
    const recentInvoices = await Invoice.findAll({
      limit: 3,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['first_name', 'last_name']
        }
      ],
      attributes: ['id', 'invoice_number', 'total_mga', 'status', 'created_at']
    });

    // Recent appointments
    const recentAppointments = await Appointment.findAll({
      limit: 3,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['first_name', 'last_name']
        }
      ],
      attributes: ['id', 'appointment_date', 'start_time', 'status', 'created_at']
    });

    // Recent payments
    const recentPayments = await Payment.findAll({
      limit: 3,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Invoice,
          as: 'invoice',
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['first_name', 'last_name']
            }
          ]
        }
      ],
      attributes: ['id', 'amount_mga', 'payment_method', 'payment_date']
    });

    res.json({
      recent_patients: recentPatients,
      recent_invoices: recentInvoices,
      recent_appointments: recentAppointments,
      recent_payments: recentPayments
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des activités récentes'
    });
  }
});

// Get revenue chart data
router.get('/revenue-chart', async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;
    
    let groupBy, dateFormat;
    let startDate = new Date(year, 0, 1); // Start of year
    let endDate = new Date(year, 11, 31); // End of year

    if (period === 'monthly') {
      groupBy = 'YYYY-MM';
      dateFormat = 'Month YYYY';
    } else if (period === 'weekly') {
      groupBy = 'YYYY-WW';
      dateFormat = 'Week WW YYYY';
    } else {
      groupBy = 'YYYY-MM-DD';
      dateFormat = 'DD/MM/YYYY';
    }

    // This is a simplified version - in production you'd use raw SQL with date functions
    const revenueData = await Invoice.findAll({
      where: {
        status: 'PAID',
        invoice_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['invoice_date', 'total_mga'],
      order: [['invoice_date', 'ASC']]
    });

    // Group data by period (simplified - would be better with SQL aggregation)
    const groupedData = {};
    revenueData.forEach(invoice => {
      const date = new Date(invoice.invoice_date);
      let key;
      
      if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'weekly') {
        // Simplified week calculation
        const week = Math.ceil(date.getDate() / 7);
        key = `${date.getFullYear()}-${String(week).padStart(2, '0')}`;
      } else {
        key = invoice.invoice_date;
      }
      
      if (!groupedData[key]) {
        groupedData[key] = 0;
      }
      groupedData[key] += parseFloat(invoice.total_mga);
    });

    // Convert to array format for charts
    const chartData = Object.entries(groupedData).map(([period, amount]) => ({
      period,
      amount,
      formatted_amount: new Intl.NumberFormat('fr-MG').format(amount) + ' MGA'
    }));

    res.json({
      period,
      year: parseInt(year),
      data: chartData,
      total: chartData.reduce((sum, item) => sum + item.amount, 0),
      currency: 'MGA'
    });
  } catch (error) {
    console.error('Revenue chart error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des données de revenus'
    });
  }
});

module.exports = router;