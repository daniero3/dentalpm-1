const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { MessageTemplate, MessageQueue, MessageLog, Patient, Appointment, Clinic, AuditLog } = require('../models');
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
router.use(auditLogger('messaging'));

// ==========================================
// MESSAGE TEMPLATES
// ==========================================

/**
 * @route GET /api/messaging/templates
 * @desc Get all message templates for clinic
 */
router.get('/templates', requireClinicId, async (req, res) => {
  try {
    const templates = await MessageTemplate.findAll({
      where: { clinic_id: req.clinic_id },
      order: [['key', 'ASC']]
    });

    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route POST /api/messaging/templates
 * @desc Create a new message template
 */
router.post('/templates', requireClinicId, [
  body('key').isString().isLength({ min: 1, max: 50 }).withMessage('Clé requise (max 50 caractères)'),
  body('channel').isIn(['SMS', 'EMAIL']).withMessage('Canal invalide'),
  body('text').isString().isLength({ min: 1 }).withMessage('Texte requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { key, channel, text } = req.body;

    // Check if template with same key exists
    const existing = await MessageTemplate.findOne({
      where: { clinic_id: req.clinic_id, key }
    });
    if (existing) {
      return res.status(409).json({ error: 'Un template avec cette clé existe déjà' });
    }

    const template = await MessageTemplate.create({
      clinic_id: req.clinic_id,
      key,
      channel,
      text,
      is_active: true
    });

    // Audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'message_template',
      resource_id: template.id,
      new_values: { key, channel },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Template créé: ${key}`
    });

    res.status(201).json({ message: 'Template créé', template });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route PATCH /api/messaging/templates/:id
 * @desc Update a message template
 */
router.patch('/templates/:id', requireClinicId, [
  param('id').isUUID(),
  body('text').optional().isString(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const template = await MessageTemplate.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });
    if (!template) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    const { text, is_active } = req.body;
    const updates = {};
    if (text !== undefined) updates.text = text;
    if (is_active !== undefined) updates.is_active = is_active;

    await template.update(updates);

    res.json({ message: 'Template mis à jour', template });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==========================================
// MESSAGE QUEUE
// ==========================================

/**
 * @route GET /api/messaging/queue
 * @desc Get message queue for clinic
 */
router.get('/queue', requireClinicId, [
  query('status').optional().isIn(['QUEUED', 'SENT', 'FAILED']),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    const whereClause = { clinic_id: req.clinic_id };
    if (status) whereClause.status = status;

    const queue = await MessageQueue.findAll({
      where: whereClause,
      include: [{
        model: Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name', 'phone_primary']
      }],
      order: [['scheduled_at', 'ASC']],
      limit: parseInt(limit)
    });

    const counts = await MessageQueue.findAll({
      where: { clinic_id: req.clinic_id },
      attributes: ['status', [require('sequelize').fn('COUNT', 'id'), 'count']],
      group: ['status'],
      raw: true
    });

    const stats = { QUEUED: 0, SENT: 0, FAILED: 0 };
    counts.forEach(c => { stats[c.status] = parseInt(c.count); });

    res.json({ queue, stats, total: queue.length });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==========================================
// MESSAGE LOGS
// ==========================================

/**
 * @route GET /api/messaging/logs
 * @desc Get message logs for clinic
 */
router.get('/logs', requireClinicId, [
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const logs = await MessageLog.findAll({
      where: { clinic_id: req.clinic_id },
      include: [{
        model: Patient,
        as: 'patient',
        attributes: ['id', 'first_name', 'last_name']
      }],
      order: [['sent_at', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({ logs, total: logs.length });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==========================================
// CRON / DISPATCH ENDPOINTS
// ==========================================

/**
 * @route POST /api/messaging/run-birthday
 * @desc Create birthday messages for patients with birthday today
 */
router.post('/run-birthday', requireClinicId, async (req, res) => {
  try {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    // Find patients with birthday today who have SMS opt-in
    const patients = await Patient.findAll({
      where: {
        clinic_id: req.clinic_id,
        is_active: true,
        consent_sms_reminders: true,
        phone_primary: { [Op.ne]: null }
      }
    });

    // Filter by birthday (month and day)
    const birthdayPatients = patients.filter(p => {
      if (!p.date_of_birth) return false;
      const dob = new Date(p.date_of_birth);
      return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
    });

    // Get birthday template
    let template = await MessageTemplate.findOne({
      where: { clinic_id: req.clinic_id, key: 'BIRTHDAY', is_active: true }
    });

    // Default template if not exists
    const defaultText = 'Joyeux anniversaire {patient_name}! Toute l\'équipe de {clinic_name} vous souhaite une excellente journée. 🎂';

    // Get clinic name
    const clinic = await Clinic.findByPk(req.clinic_id);
    const clinicName = clinic?.name || 'Notre clinique';

    let created = 0;
    const scheduledAt = new Date();
    scheduledAt.setHours(7, 0, 0, 0); // Schedule for 07:00

    for (const patient of birthdayPatients) {
      // Check if message already queued today
      const existing = await MessageQueue.findOne({
        where: {
          patient_id: patient.id,
          message_type: 'BIRTHDAY',
          created_at: { [Op.gte]: new Date(today.setHours(0, 0, 0, 0)) }
        }
      });
      if (existing) continue;

      const text = (template?.text || defaultText)
        .replace('{patient_name}', `${patient.first_name} ${patient.last_name}`)
        .replace('{clinic_name}', clinicName);

      await MessageQueue.create({
        clinic_id: req.clinic_id,
        patient_id: patient.id,
        channel: template?.channel || 'SMS',
        to: patient.phone_primary,
        text,
        scheduled_at: scheduledAt,
        status: 'QUEUED',
        message_type: 'BIRTHDAY'
      });
      created++;
    }

    // Audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'birthday_messages',
      new_values: { created, checked: birthdayPatients.length },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Job anniversaire: ${created} messages créés sur ${birthdayPatients.length} anniversaires`
    });

    res.json({
      message: `Job anniversaire exécuté`,
      birthday_patients_found: birthdayPatients.length,
      messages_created: created
    });
  } catch (error) {
    console.error('Run birthday error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * @route POST /api/messaging/run-dispatch
 * @desc Dispatch queued messages (simulation - no real SMS/Email sent)
 */
router.post('/run-dispatch', requireClinicId, async (req, res) => {
  try {
    const now = new Date();

    // Find queued messages ready to send
    const queuedMessages = await MessageQueue.findAll({
      where: {
        clinic_id: req.clinic_id,
        status: 'QUEUED',
        scheduled_at: { [Op.lte]: now }
      },
      limit: 100
    });

    let sent = 0;
    let failed = 0;

    for (const msg of queuedMessages) {
      try {
        // Simulate sending (always succeeds in MVP)
        const providerResponse = JSON.stringify({
          simulated: true,
          timestamp: new Date().toISOString(),
          message_id: `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });

        // Create log entry
        await MessageLog.create({
          clinic_id: msg.clinic_id,
          patient_id: msg.patient_id,
          channel: msg.channel,
          to: msg.to,
          text: msg.text,
          status: 'SENT',
          sent_at: new Date(),
          provider_response: providerResponse,
          message_type: msg.message_type,
          queue_id: msg.id
        });

        // Update queue status
        await msg.update({ status: 'SENT' });
        sent++;
      } catch (e) {
        // Mark as failed
        await msg.update({ status: 'FAILED' });
        await MessageLog.create({
          clinic_id: msg.clinic_id,
          patient_id: msg.patient_id,
          channel: msg.channel,
          to: msg.to,
          text: msg.text,
          status: 'FAILED',
          sent_at: new Date(),
          provider_response: JSON.stringify({ error: e.message }),
          message_type: msg.message_type,
          queue_id: msg.id
        });
        failed++;
      }
    }

    // Audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      resource_type: 'message_dispatch',
      new_values: { sent, failed, processed: queuedMessages.length },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Dispatch: ${sent} envoyés, ${failed} échoués`
    });

    res.json({
      message: 'Dispatch exécuté',
      processed: queuedMessages.length,
      sent,
      failed
    });
  } catch (error) {
    console.error('Run dispatch error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ==========================================
// HELPER: Create appointment reminder
// ==========================================

/**
 * Creates a reminder message for an appointment (T-24h)
 * Called from appointments route on create/update
 */
async function createAppointmentReminder(appointment, clinic_id) {
  try {
    // Get patient
    const patient = await Patient.findByPk(appointment.patient_id);
    if (!patient || !patient.consent_sms_reminders || !patient.phone_primary) {
      return null;
    }

    // Calculate T-24h
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const scheduledAt = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);

    // Don't create if already past
    if (scheduledAt < new Date()) {
      return null;
    }

    // Get template
    let template = await MessageTemplate.findOne({
      where: { clinic_id, key: 'APPT_REMINDER_24H', is_active: true }
    });

    // Get clinic name
    const clinic = await Clinic.findByPk(clinic_id);
    const clinicName = clinic?.name || 'Notre clinique';

    const defaultText = 'Rappel: Vous avez RDV demain {date} à {time} chez {clinic_name}. Merci de confirmer votre présence.';

    const text = (template?.text || defaultText)
      .replace('{patient_name}', `${patient.first_name} ${patient.last_name}`)
      .replace('{date}', new Date(appointment.appointment_date).toLocaleDateString('fr-FR'))
      .replace('{time}', appointment.start_time.substring(0, 5))
      .replace('{clinic_name}', clinicName);

    // Check if reminder already exists for this appointment
    const existing = await MessageQueue.findOne({
      where: {
        reference_id: appointment.id,
        message_type: 'APPT_REMINDER_24H',
        status: 'QUEUED'
      }
    });

    if (existing) {
      // Update existing
      await existing.update({ text, scheduled_at: scheduledAt, to: patient.phone_primary });
      return existing;
    }

    // Create new
    const queueItem = await MessageQueue.create({
      clinic_id,
      patient_id: patient.id,
      channel: template?.channel || 'SMS',
      to: patient.phone_primary,
      text,
      scheduled_at: scheduledAt,
      status: 'QUEUED',
      message_type: 'APPT_REMINDER_24H',
      reference_id: appointment.id
    });

    return queueItem;
  } catch (error) {
    console.error('Create appointment reminder error:', error);
    return null;
  }
}

// Export helper for use in appointments route
router.createAppointmentReminder = createAppointmentReminder;

module.exports = router;
