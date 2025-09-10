const express = require('express');
const { body, validationResult } = require('express-validator');
const { SmsLog, Patient, Appointment, AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Mock SMS sending
router.post('/sms/send', [
  body('phone_number')
    .matches(/^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/)
    .withMessage('Numéro de téléphone malgache invalide'),
  body('message')
    .isLength({ min: 1, max: 160 })
    .withMessage('Message requis (max 160 caractères)'),
  body('message_type')
    .isIn(['APPOINTMENT_REMINDER', 'APPOINTMENT_CONFIRMATION', 'TREATMENT_FOLLOW_UP', 'INVOICE_NOTIFICATION', 'PAYMENT_CONFIRMATION', 'BIRTHDAY_GREETING', 'CUSTOM'])
    .withMessage('Type de message invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const {
      phone_number,
      message,
      message_type,
      patient_id,
      appointment_id
    } = req.body;

    // Validate patient_id if provided
    if (patient_id) {
      const patient = await Patient.findByPk(patient_id);
      if (!patient) {
        return res.status(404).json({
          error: 'Patient non trouvé',
          details: [{ 
            type: 'field',
            msg: 'Patient avec cet ID n\'existe pas',
            path: 'patient_id',
            location: 'body'
          }]
        });
      }
    }

    // Detect carrier based on phone number (simplified logic)
    let carrier = 'TELMA'; // Default
    const phoneDigits = phone_number.replace(/\D/g, '');
    
    if (phoneDigits.startsWith('26132') || phoneDigits.startsWith('26133')) {
      carrier = 'ORANGE';
    } else if (phoneDigits.startsWith('26134')) {
      carrier = 'AIRTEL';
    }

    // Calculate mock cost (simplified pricing)
    const baseCost = 50; // 50 MGA per SMS
    const cost_mga = message.length > 70 ? baseCost * 2 : baseCost;

    // Create SMS log entry
    const smsLog = await SmsLog.create({
      patient_id,
      appointment_id,
      phone_number,
      message_type,
      message_content: message,
      carrier,
      status: 'SENT', // Mock as immediately sent
      sent_at: new Date(),
      delivered_at: new Date(Date.now() + 5000), // Mock delivery after 5 seconds
      cost_mga,
      is_mock: true
    });

    // Log the SMS sending
    await AuditLog.create({
      user_id: req.user.id,
      action: 'SEND_SMS',
      resource_type: 'sms_logs',
      resource_id: smsLog.id,
      new_values: { phone_number, message_type, carrier },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `SMS envoyé (MOCK) vers ${phone_number} via ${carrier}`
    });

    res.json({
      success: true,
      message: process.env.MOCK_SMS_ENABLED === 'true' 
        ? 'SMS simulé envoyé avec succès'
        : 'SMS envoyé avec succès',
      sms_log: {
        id: smsLog.id,
        phone_number: smsLog.phone_number,
        status: smsLog.status,
        carrier: smsLog.carrier,
        cost_mga: smsLog.cost_mga,
        sent_at: smsLog.sent_at,
        is_mock: smsLog.is_mock
      }
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'envoi du SMS'
    });
  }
});

// Mock appointment reminder SMS
router.post('/sms/appointment-reminder', [
  body('appointment_id').isUUID().withMessage('ID rendez-vous invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { appointment_id } = req.body;

    // Get appointment details
    const appointment = await Appointment.findByPk(appointment_id, {
      include: [
        {
          model: Patient,
          as: 'patient'
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Rendez-vous non trouvé'
      });
    }

    const patient = appointment.patient;
    
    // Generate reminder message in French
    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('fr-FR');
    const message = `Bonjour ${patient.first_name}, rappel de votre RDV dentaire le ${appointmentDate} à ${appointment.start_time}. Cabinet Dentaire Madagascar. Pour annuler: appelez-nous.`;

    // Send SMS using the mock service
    const smsResult = await req.app.locals.sendSms({
      phone_number: patient.phone_primary,
      message,
      message_type: 'APPOINTMENT_REMINDER',
      patient_id: patient.id,
      appointment_id: appointment.id
    });

    // Update appointment reminder status
    await appointment.update({
      reminder_sent: true,
      reminder_sent_at: new Date()
    });

    res.json({
      success: true,
      message: 'Rappel de rendez-vous envoyé',
      appointment: {
        id: appointment.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time
      },
      sms_details: smsResult
    });
  } catch (error) {
    console.error('Send appointment reminder error:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'envoi du rappel'
    });
  }
});

// Mock Mobile Money payment processing
router.post('/mobile-money/process-payment', [
  body('phone_number')
    .matches(/^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/)
    .withMessage('Numéro de téléphone malgache invalide'),
  body('amount_mga')
    .isFloat({ min: 100 })
    .withMessage('Montant invalide (minimum 100 MGA)'),
  body('provider')
    .isIn(['MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY'])
    .withMessage('Fournisseur de paiement mobile invalide'),
  body('invoice_id')
    .isUUID()
    .withMessage('ID facture invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const {
      phone_number,
      amount_mga,
      provider,
      invoice_id,
      customer_reference
    } = req.body;

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock success rate: 90% success, 10% failure
    const isSuccess = Math.random() < 0.9;
    
    const transactionId = `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (isSuccess) {
      // Log successful payment
      await AuditLog.create({
        user_id: req.user.id,
        action: 'PAYMENT_PROCESS',
        resource_type: 'payments',
        resource_id: null,
        new_values: {
          provider,
          amount_mga,
          phone_number,
          transaction_id,
          status: 'SUCCESS'
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        description: `Paiement mobile money traité (MOCK): ${amount_mga} MGA via ${provider}`
      });

      res.json({
        success: true,
        transaction_id: transactionId,
        status: 'COMPLETED',
        amount_mga: parseFloat(amount_mga),
        provider,
        phone_number,
        processing_fee_mga: amount_mga * 0.02, // 2% fee
        message: process.env.MOCK_MOBILE_MONEY_ENABLED === 'true'
          ? 'Paiement mobile money simulé traité avec succès'
          : 'Paiement traité avec succès',
        reference: customer_reference,
        processed_at: new Date().toISOString()
      });
    } else {
      // Simulate failure
      const failureReasons = [
        'Solde insuffisant',
        'Numéro de téléphone invalide',
        'Service temporairement indisponible',
        'Transaction annulée par l\'utilisateur'
      ];
      
      const failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
      
      res.status(400).json({
        success: false,
        error: 'Échec du paiement mobile money',
        reason: failureReason,
        transaction_id: transactionId,
        provider,
        amount_mga: parseFloat(amount_mga),
        retry_allowed: true
      });
    }
  } catch (error) {
    console.error('Mobile money payment error:', error);
    res.status(500).json({
      error: 'Erreur lors du traitement du paiement mobile money'
    });
  }
});

// Get SMS logs
router.get('/sms/logs', async (req, res) => {
  try {
    const { page = 1, limit = 20, patient_id, message_type, status } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    
    if (patient_id) whereClause.patient_id = patient_id;
    if (message_type) whereClause.message_type = message_type;
    if (status) whereClause.status = status;

    const { count, rows: smsLogs } = await SmsLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: Appointment,
          as: 'appointment',
          required: false,
          attributes: ['id', 'appointment_date', 'start_time']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      sms_logs: smsLogs,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get SMS logs error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des logs SMS'
    });
  }
});

module.exports = router;