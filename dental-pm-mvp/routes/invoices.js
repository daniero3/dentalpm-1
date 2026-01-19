const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Invoice, InvoiceItem, Patient, Payment, Procedure, AuditLog, PricingSchedule, ProcedureFee } = require('../models');
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

    const { patient_id, items, discount_percentage = 0, discount_type, nif_number, stat_number, notes } = req.body;

    // Verify patient exists
    const patient = await Patient.findByPk(patient_id);
    if (!patient) {
      return res.status(404).json({
        error: 'Patient non trouvé'
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

module.exports = router;