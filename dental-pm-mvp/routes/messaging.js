const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult, param, query } = require('express-validator');
const { MessageTemplate, MessageQueue, MessageLog, Patient, Appointment, Clinic, AuditLog } = require('../models');
const { auditLogger } = require('../middleware/auditLogger');
const { Op } = require('sequelize');

const router = express.Router();

// ✅ Pas de requireValidSubscription ni requireClinicId bloquant
router.use(auditLogger('messaging'));

const getClinicId = (req) => {
  const fromReq = req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
  if (fromReq) return fromReq;
  try { const t = req.headers['authorization']?.split(' ')[1]; return t ? jwt.verify(t, process.env.JWT_SECRET).clinic_id : null; } catch(e) { return null; }
};
const getUserId = (req) => {
  const fromUser = req.user?.id || req.user?.dataValues?.id || req.user?.userId || null;
  if (fromUser) return fromUser;
  try { const t = req.headers['authorization']?.split(' ')[1]; return t ? (jwt.verify(t, process.env.JWT_SECRET).userId || null) : null; } catch(e) { return null; }
};

// ── GET /templates ────────────────────────────────────────────────────────────
router.get('/templates', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = clinicId ? { clinic_id: clinicId } : {};
    const templates = await MessageTemplate.findAll({ where, order: [['key','ASC']] });
    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── POST /templates ───────────────────────────────────────────────────────────
router.post('/templates', [
  body('key').isString().isLength({ min:1, max:50 }),
  body('channel').isIn(['SMS','EMAIL']),
  body('text').isString().isLength({ min:1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const { key, channel, text } = req.body;

    const existing = await MessageTemplate.findOne({ where: { clinic_id: clinicId, key } });
    if (existing) return res.status(409).json({ error:'Un template avec cette clé existe déjà' });

    // clinic_id NOT NULL — résoudre depuis toutes les sources
    let resolvedClinicId = clinicId;
    if (!resolvedClinicId && req.user) {
      try {
        const { User, Clinic } = require('../models');
        // Chercher via User
        const uid = (req.user?.id || req.user?.dataValues?.id) || req.user.dataValues?.id;
        if (uid) {
          const u = await User.findByPk(uid, { attributes: ['clinic_id'] });
          resolvedClinicId = u?.clinic_id || null;
        }
        // Si toujours null, prendre la première clinique
        if (!resolvedClinicId) {
          const firstClinic = await Clinic.findOne({ where: { is_active: true }, attributes: ['id'] });
          resolvedClinicId = firstClinic?.id || null;
        }
      } catch(e) { console.warn('Clinic resolve:', e.message); }
    }
    if (!resolvedClinicId) {
      return res.status(400).json({ error: 'Reconnectez-vous pour obtenir un token avec clinic_id.' });
    }

    const template = await MessageTemplate.create({ clinic_id: resolvedClinicId, key, channel, text, is_active: true });

    try { await AuditLog.create({ user_id: getUserId(req), action:'CREATE', resource_type:'message_template', resource_id: template.id, new_values: { key, channel }, ip_address: req.ip, description:`Template créé: ${key}` }); } catch(e) {}

    res.status(201).json({ message:'Template créé', template });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── PATCH /templates/:id ──────────────────────────────────────────────────────
router.patch('/templates/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const template = await MessageTemplate.findOne({ where: { id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}) } });
    if (!template) return res.status(404).json({ error:'Template non trouvé' });

    const updates = {};
    if (req.body.text      !== undefined) updates.text      = req.body.text;
    if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;
    await template.update(updates);
    res.json({ message:'Template mis à jour', template });
  } catch (error) {
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── GET /queue ────────────────────────────────────────────────────────────────
router.get('/queue', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const { status, limit=50 } = req.query;
    const where = clinicId ? { clinic_id: clinicId } : {};
    if (status) where.status = status;

    const queue = await MessageQueue.findAll({
      where,
      include: [{ model: Patient, as: 'patient', attributes: ['id','first_name','last_name','phone_primary'], required: false }],
      order: [['scheduled_at','ASC']],
      limit: parseInt(limit)
    });

    const counts = await MessageQueue.findAll({
      where: clinicId ? { clinic_id: clinicId } : {},
      attributes: ['status', [require('sequelize').fn('COUNT', 'id'), 'count']],
      group: ['status'], raw: true
    });

    const stats = { QUEUED:0, SENT:0, FAILED:0 };
    counts.forEach(c => { stats[c.status] = parseInt(c.count); });

    res.json({ queue, stats, total: queue.length });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── GET /logs ─────────────────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const { limit=50 } = req.query;
    const where = clinicId ? { clinic_id: clinicId } : {};

    const logs = await MessageLog.findAll({
      where,
      include: [{ model: Patient, as: 'patient', attributes: ['id','first_name','last_name'], required: false }],
      order: [['sent_at','DESC']],
      limit: parseInt(limit)
    });
    res.json({ logs, total: logs.length });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── POST /run-birthday ────────────────────────────────────────────────────────
router.post('/run-birthday', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    if (!clinicId) return res.json({ message:'Aucune clinique associée', birthday_patients_found: 0, messages_created: 0 });

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay   = today.getDate();

    const patients = await Patient.findAll({
      where: { clinic_id: clinicId, is_active: true, consent_sms_reminders: true, phone_primary: { [Op.ne]: null } }
    });

    const birthdayPatients = patients.filter(p => {
      if (!p.date_of_birth) return false;
      const dob = new Date(p.date_of_birth);
      return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
    });

    const template  = await MessageTemplate.findOne({ where: { clinic_id: clinicId, key:'BIRTHDAY', is_active: true } });
    const clinic    = await Clinic.findByPk(clinicId);
    const clinicName = clinic?.name || 'Notre clinique';
    const defaultText = 'Joyeux anniversaire {patient_name}! Toute l\'équipe de {clinic_name} vous souhaite une excellente journée.';
    const scheduledAt = new Date(); scheduledAt.setHours(7, 0, 0, 0);

    let created = 0;
    for (const patient of birthdayPatients) {
      const existing = await MessageQueue.findOne({ where: { patient_id: patient.id, message_type:'BIRTHDAY', created_at: { [Op.gte]: new Date(today.setHours(0,0,0,0)) } } });
      if (existing) continue;

      const text = (template?.text || defaultText)
        .replace('{patient_name}', `${patient.first_name} ${patient.last_name}`)
        .replace('{clinic_name}', clinicName);

      await MessageQueue.create({ clinic_id: clinicId, patient_id: patient.id, channel: template?.channel || 'SMS', to: patient.phone_primary, text, scheduled_at: scheduledAt, status:'QUEUED', message_type:'BIRTHDAY' });
      created++;
    }

    res.json({ message:'Job anniversaire exécuté', birthday_patients_found: birthdayPatients.length, messages_created: created });
  } catch (error) {
    console.error('Run birthday error:', error);
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── POST /run-dispatch ────────────────────────────────────────────────────────
router.post('/run-dispatch', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where = { status:'QUEUED', scheduled_at: { [Op.lte]: new Date() } };
    if (clinicId) where.clinic_id = clinicId;

    const queued = await MessageQueue.findAll({ where, limit: 100 });
    let sent = 0, failed = 0;

    for (const msg of queued) {
      try {
        const providerResponse = JSON.stringify({ simulated: true, timestamp: new Date().toISOString(), message_id: `SIM-${Date.now()}` });
        await MessageLog.create({ clinic_id: msg.clinic_id, patient_id: msg.patient_id, channel: msg.channel, to: msg.to, text: msg.text, status:'SENT', sent_at: new Date(), provider_response: providerResponse, message_type: msg.message_type, queue_id: msg.id });
        await msg.update({ status:'SENT' });
        sent++;
      } catch(e) {
        await msg.update({ status:'FAILED' });
        failed++;
      }
    }

    res.json({ message:'Dispatch exécuté', processed: queued.length, sent, failed });
  } catch (error) {
    console.error('Run dispatch error:', error);
    res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── Helper exporté pour appointments.js ──────────────────────────────────────
async function createAppointmentReminder(appointment, clinic_id) {
  try {
    const patient = await Patient.findByPk(appointment.patient_id);
    if (!patient || !patient.consent_sms_reminders || !patient.phone_primary) return null;

    const apptDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const scheduledAt  = new Date(apptDateTime.getTime() - 24 * 60 * 60 * 1000);
    if (scheduledAt < new Date()) return null;

    const template   = await MessageTemplate.findOne({ where: { clinic_id, key:'APPT_REMINDER_24H', is_active: true } });
    const clinic     = await Clinic.findByPk(clinic_id);
    const clinicName = clinic?.name || 'Notre clinique';
    const defaultText = 'Rappel: Vous avez RDV demain {date} à {time} chez {clinic_name}.';

    const text = (template?.text || defaultText)
      .replace('{patient_name}', `${patient.first_name} ${patient.last_name}`)
      .replace('{date}', new Date(appointment.appointment_date).toLocaleDateString('fr-FR'))
      .replace('{time}', appointment.start_time.substring(0, 5))
      .replace('{clinic_name}', clinicName);

    const existing = await MessageQueue.findOne({ where: { reference_id: appointment.id, message_type:'APPT_REMINDER_24H', status:'QUEUED' } });
    if (existing) { await existing.update({ text, scheduled_at: scheduledAt, to: patient.phone_primary }); return existing; }

    if (!clinic_id) { console.warn('createAppointmentReminder: clinic_id null, skip'); return null; }
    return await MessageQueue.create({ clinic_id, patient_id: patient.id, channel: template?.channel || 'SMS', to: patient.phone_primary, text, scheduled_at: scheduledAt, status:'QUEUED', message_type:'APPT_REMINDER_24H', reference_id: appointment.id });
  } catch (error) {
    console.error('Create appointment reminder error:', error);
    return null;
  }
}

router.createAppointmentReminder = createAppointmentReminder;
module.exports = router;
