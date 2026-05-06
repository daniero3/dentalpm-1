const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Appointment, Patient, User, AuditLog, sequelize } = require('../models');
const { auditLogger } = require('../middleware/auditLogger');
const multer = require('multer');
const csv = require('csv-parse/sync');

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
const { Op } = require('sequelize');

// Import messaging helper (non-bloquant)
let messagingRouter = null;
try { messagingRouter = require('./messaging'); } catch(e) {}

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

// ✅ Pas de requireValidSubscription ni requireClinicId bloquant
router.use(auditLogger('appointments'));

const APPOINTMENT_STATUSES = ['SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW','RESCHEDULED'];
const APPOINTMENT_TYPES    = ['CONSULTATION','TREATMENT','FOLLOW_UP','EMERGENCY','CLEANING','CHECK_UP'];

const isSuperAdmin     = (req) => req.user?.role === 'SUPER_ADMIN';
const getClinicId      = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
const getUserId        = (req) => req.user?.id   || req.user?.dataValues?.id || null;
const normalizeDateOnly = (v)  => v ? String(v).split('T')[0] : v;

const normalizeTimeHHMM = (v) => {
  if (!v) return v;
  const s = String(v).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
  if (/^\d{1}:\d{2}$/.test(s)) return `0${s}`;
  return s;
};

const normalizeTimeForDb = (v) => {
  const hhmm = normalizeTimeHHMM(v);
  if (!hhmm) return hhmm;
  if (/^\d{2}:\d{2}$/.test(hhmm)) return `${hhmm}:00`;
  return hhmm;
};

const parseCsvDate = (value) => {
  if (!value) return null;
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parts = str.split(/[\/.-]/).map(p => p.trim());
  if (parts.length === 3 && parts[2].length === 4) {
    const [d, m, y] = parts;
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str;
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
};

const normalizeAppointmentType = (value) => {
  if (!value) return 'CONSULTATION';
  const key = String(value).trim().toUpperCase();
  const map = {
    CONSULTATION: 'CONSULTATION',
    CONSULT: 'CONSULTATION',
    TREATMENT: 'TREATMENT',
    TRAITEMENT: 'TREATMENT',
    FOLLOW_UP: 'FOLLOW_UP',
    SUIVI: 'FOLLOW_UP',
    EMERGENCY: 'EMERGENCY',
    URGENCE: 'EMERGENCY',
    CLEANING: 'CLEANING',
    NETTOYAGE: 'CLEANING',
    CHECK_UP: 'CHECK_UP',
    CHECKUP: 'CHECK_UP',
    CONTROLE: 'CHECK_UP',
    CONTRÔLE: 'CHECK_UP'
  };
  return map[key] || 'CONSULTATION';
};

const normalizeAppointmentStatus = (value) => {
  if (!value) return 'SCHEDULED';
  const key = String(value).trim().toUpperCase();
  const map = {
    SCHEDULED: 'SCHEDULED',
    PLANIFIE: 'SCHEDULED',
    PLANIFIÉ: 'SCHEDULED',
    CONFIRMED: 'CONFIRMED',
    CONFIRME: 'CONFIRMED',
    CONFIRMÉ: 'CONFIRMED',
    IN_PROGRESS: 'IN_PROGRESS',
    EN_COURS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    TERMINE: 'COMPLETED',
    TERMINÉ: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    ANNULE: 'CANCELLED',
    ANNULÉ: 'CANCELLED',
    NO_SHOW: 'NO_SHOW',
    ABSENT: 'NO_SHOW',
    RESCHEDULED: 'RESCHEDULED',
    REPORTE: 'RESCHEDULED',
    REPORTÉ: 'RESCHEDULED'
  };
  return map[key] || 'SCHEDULED';
};

const resolvePatient = async (row, clinicId, transaction) => {
  const patientId = normalizeText(row.patient_id);
  if (patientId) {
    const byId = await Patient.findOne({ where: { id: patientId, ...(clinicId ? { clinic_id: clinicId } : {}) }, transaction });
    if (byId) return byId;
  }

  const patientNumber = normalizeText(row.patient_number);
  if (patientNumber) {
    const byNumber = await Patient.findOne({ where: { patient_number: patientNumber, ...(clinicId ? { clinic_id: clinicId } : {}) }, transaction });
    if (byNumber) return byNumber;
  }

  const phone = normalizeText(row.patient_phone_primary);
  if (phone) {
    const byPhone = await Patient.findOne({ where: { phone_primary: phone, ...(clinicId ? { clinic_id: clinicId } : {}) }, transaction });
    if (byPhone) return byPhone;
  }

  const email = normalizeText(row.patient_email);
  if (email) {
    const byEmail = await Patient.findOne({ where: { email, ...(clinicId ? { clinic_id: clinicId } : {}) }, transaction });
    if (byEmail) return byEmail;
  }

  return null;
};

const resolveDentist = async (row, clinicId, req, transaction) => {
  const dentistId = normalizeText(row.dentist_id);
  if (dentistId) {
    const byId = await User.findOne({
      where: {
        id: dentistId,
        ...(clinicId ? { clinic_id: clinicId } : {}),
        role: 'DENTIST'
      },
      transaction
    });
    if (byId) return byId.id;
  }

  const dentistEmail = normalizeText(row.dentist_email);
  if (dentistEmail) {
    const byEmail = await User.findOne({
      where: {
        email: dentistEmail,
        ...(clinicId ? { clinic_id: clinicId } : {})
      },
      transaction
    });
    if (byEmail) return byEmail.id;
  }

  const dentistName = normalizeText(row.dentist_name);
  if (dentistName) {
    const byName = await User.findOne({
      where: {
        full_name: dentistName,
        ...(clinicId ? { clinic_id: clinicId } : {}),
        role: 'DENTIST'
      },
      transaction
    });
    if (byName) return byName.id;
  }

  if (req.user?.role === 'DENTIST') {
    const currentUserId = getUserId(req);
    if (currentUserId) return currentUserId;
  }

  return null;
};

const timeToMinutes = (v) => {
  const hhmm = normalizeTimeHHMM(v);
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60) + m;
};

const buildWhere = (req, extra = {}) => {
  const where = { ...extra };
  if (!isSuperAdmin(req)) {
    const clinicId = getClinicId(req);
    if (clinicId) where.clinic_id = clinicId;
  }
  return where;
};

const extractErrors = (error) => {
  if (error?.name === 'SequelizeValidationError' && Array.isArray(error.errors)) {
    return error.errors.map(e => ({ field: e.path, message: e.message }));
  }
  return error?.message || null;
};

router.post('/import-csv', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Fichier CSV requis' });
  }

  const clinicId = getClinicId(req);
  if (!clinicId && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Cabinet non identifié', code: 'NO_CLINIC' });
  }

  let rows = [];
  try {
    rows = csv.parse(file.buffer.toString('utf8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
  } catch (error) {
    return res.status(400).json({ error: 'CSV invalide', details: error.message });
  }

  const result = { inserted: 0, updated: 0, skipped: 0, errors: [] };
  const transaction = await sequelize.transaction();

  try {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;

      try {
        const patient = await resolvePatient(row, clinicId, transaction);
        if (!patient) {
          result.skipped += 1;
          result.errors.push({
            row: rowNumber,
            error: 'Patient introuvable dans ce cabinet'
          });
          continue;
        }

        const appointmentDate = parseCsvDate(row.appointment_date || row.date);
        const startTime = normalizeTimeHHMM(row.start_time || row.start || row.begin_time);
        const endTime = normalizeTimeHHMM(row.end_time || row.end || row.finish_time);
        const appointmentType = normalizeAppointmentType(row.appointment_type || row.type);
        const status = normalizeAppointmentStatus(row.status);
        const reason = normalizeText(row.reason || row.motif);
        const notes = normalizeText(row.notes || row.commentaire || row.comment);
        const chairNumber = normalizeText(row.chair_number || row.chair || row.salle);

        if (!appointmentDate) {
          throw new Error('appointment_date manquant ou invalide');
        }
        if (!startTime || !endTime) {
          throw new Error('start_time et end_time sont requis');
        }
        if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
          throw new Error('end_time doit être après start_time');
        }

        const dentist_id = await resolveDentist(row, clinicId, req, transaction);

        const existing = await Appointment.findOne({
          where: {
            clinic_id: clinicId,
            patient_id: patient.id,
            appointment_date: appointmentDate,
            start_time: normalizeTimeForDb(startTime),
            end_time: normalizeTimeForDb(endTime),
            ...(dentist_id ? { dentist_id } : {})
          },
          transaction
        });

        const payload = {
          patient_id: patient.id,
          dentist_id,
          clinic_id: clinicId,
          appointment_date: appointmentDate,
          start_time: normalizeTimeForDb(startTime),
          end_time: normalizeTimeForDb(endTime),
          appointment_type: appointmentType,
          status,
          reason,
          notes,
          chair_number: chairNumber,
          confirmed_by_patient: status === 'CONFIRMED',
          confirmed_at: status === 'CONFIRMED' ? new Date() : null,
          cancelled_at: status === 'CANCELLED' ? new Date() : null,
          cancelled_reason: status === 'CANCELLED' ? normalizeText(row.cancelled_reason || row.cancel_reason) : null
        };

        if (existing) {
          await existing.update(payload, { transaction });
          result.updated += 1;
        } else {
          await Appointment.create(payload, { transaction });
          result.inserted += 1;
        }
      } catch (rowError) {
        result.skipped += 1;
        result.errors.push({
          row: rowNumber,
          error: rowError.message || 'Erreur ligne'
        });
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Import appointments error:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'import CSV', details: extractErrors(error) });
  }

  try {
    await AuditLog.create({
      user_id: getUserId(req),
      action: 'IMPORT',
      resource_type: 'appointments',
      resource_id: null,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Import CSV rendez-vous: ${result.inserted} créés, ${result.updated} mis à jour, ${result.skipped} ignorés`
    });
  } catch (auditErr) {
    console.error('Audit log error:', auditErr);
  }

  return res.json({
    message: 'Import terminé',
    ...result
  });
});

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', [
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('dentist_id').optional().isUUID(),
  query('status').optional().isIn(APPOINTMENT_STATUSES)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Paramètres invalides', details: errors.array() });

    const where = buildWhere(req);
    const { date_from, date_to, start_date, end_date, dentist_id, status } = req.query;
    const fromDate = date_from || start_date;
    const toDate   = date_to   || end_date;

    if (fromDate && toDate) where.appointment_date = { [Op.gte]: normalizeDateOnly(fromDate), [Op.lte]: normalizeDateOnly(toDate) };
    else if (fromDate) where.appointment_date = { [Op.gte]: normalizeDateOnly(fromDate) };
    else if (toDate)   where.appointment_date = { [Op.lte]: normalizeDateOnly(toDate) };

    if (dentist_id) where.dentist_id = dentist_id;
    if (status)     where.status     = status;

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id','first_name','last_name','phone_primary'], required: false },
        { model: User,    as: 'dentist', attributes: ['id','full_name','specialization'],            required: false }
      ],
      order: [['appointment_date','ASC'],['start_time','ASC']]
    });

    res.json({ appointments, count: appointments.length });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error:'Erreur récupération rendez-vous', details: extractErrors(error) });
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: buildWhere(req, { id: req.params.id }),
      include: [
        { model: Patient, as: 'patient', attributes: ['id','first_name','last_name','phone_primary','email'], required: false },
        { model: User,    as: 'dentist', attributes: ['id','full_name','specialization'],                    required: false }
      ]
    });
    if (!appointment) return res.status(404).json({ error:'Rendez-vous non trouvé' });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error:'Erreur récupération rendez-vous', details: extractErrors(error) });
  }
});

// ── POST / ────────────────────────────────────────────────────────────────────
router.post('/', [
  body('patient_id').isUUID(),
  body('dentist_id').optional({ nullable:true, checkFalsy:true }).isUUID(),
  body('appointment_date').isISO8601(),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
  body('appointment_type').isIn(APPOINTMENT_TYPES)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const { patient_id, appointment_date, start_time, end_time, appointment_type, reason, notes, chair_number } = req.body;
    const clinicId = getClinicId(req);
    const userId   = getUserId(req);

    let dentist_id = req.body.dentist_id || null;
    if (!dentist_id && req.user?.role === 'DENTIST') dentist_id = userId;

    // Vérifier patient
    const patientWhere = isSuperAdmin(req) ? { id: patient_id } : { id: patient_id, ...(clinicId ? { clinic_id: clinicId } : {}) };
    const patient = await Patient.findOne({ where: patientWhere });
    if (!patient) return res.status(404).json({ error:'Patient non trouvé' });

    const normalizedDate  = normalizeDateOnly(appointment_date);
    const normalizedStart = normalizeTimeHHMM(start_time);
    const normalizedEnd   = normalizeTimeHHMM(end_time);
    const duration_minutes = timeToMinutes(normalizedEnd) - timeToMinutes(normalizedStart);
    if (duration_minutes <= 0) return res.status(400).json({ error:'end_time doit être après start_time' });

    // Conflit horaire
    if (dentist_id) {
      const conflict = await Appointment.findOne({
        where: {
          dentist_id, appointment_date: normalizedDate,
          status: { [Op.notIn]: ['CANCELLED','NO_SHOW'] },
          [Op.and]: [
            { start_time: { [Op.lt]: normalizeTimeForDb(normalizedEnd) } },
            { end_time:   { [Op.gt]: normalizeTimeForDb(normalizedStart) } }
          ],
          ...(clinicId ? { clinic_id: clinicId } : {})
        }
      });
      if (conflict) return res.status(409).json({ error:'Conflit d\'horaire avec un autre rendez-vous' });
    }

    const appointment = await Appointment.create({
      patient_id, dentist_id,
      appointment_date: normalizedDate,
      start_time: normalizeTimeForDb(normalizedStart),
      end_time:   normalizeTimeForDb(normalizedEnd),
      duration_minutes, appointment_type,
      reason: reason || null, notes: notes || null,
      chair_number: chair_number || null,
      clinic_id: clinicId
    });

    const complete = await Appointment.findByPk(appointment.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id','first_name','last_name','phone_primary'], required: false },
        { model: User,    as: 'dentist', attributes: ['id','full_name'],                             required: false }
      ]
    });

    res.status(201).json({ message:'Rendez-vous créé avec succès', appointment: complete });

    // Reminder SMS async
    if (messagingRouter?.createAppointmentReminder) {
      messagingRouter.createAppointmentReminder(appointment, clinicId).catch(e => console.error('Reminder error:', e));
    }
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error:'Erreur création rendez-vous', details: extractErrors(error) });
  }
});

// ── PUT /:id ──────────────────────────────────────────────────────────────────
router.put('/:id', [
  param('id').isUUID(),
  body('appointment_date').optional().isISO8601(),
  body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
  body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
  body('appointment_type').optional().isIn(APPOINTMENT_TYPES),
  body('status').optional().isIn(APPOINTMENT_STATUSES)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const appointment = await Appointment.findOne({ where: buildWhere(req, { id: req.params.id }) });
    if (!appointment) return res.status(404).json({ error:'Rendez-vous non trouvé' });

    const updates = {};
    const allowed = ['dentist_id','appointment_date','start_time','end_time','appointment_type','reason','notes','chair_number','status'];
    for (const field of allowed) {
      if (req.body[field] === undefined) continue;
      if (field === 'appointment_date') updates[field] = normalizeDateOnly(req.body[field]);
      else if (field === 'start_time' || field === 'end_time') updates[field] = normalizeTimeHHMM(req.body[field]);
      else updates[field] = req.body[field];
    }

    const finalStart = updates.start_time || normalizeTimeHHMM(appointment.start_time);
    const finalEnd   = updates.end_time   || normalizeTimeHHMM(appointment.end_time);
    if (timeToMinutes(finalEnd) <= timeToMinutes(finalStart)) return res.status(400).json({ error:'end_time doit être après start_time' });

    updates.start_time     = normalizeTimeForDb(finalStart);
    updates.end_time       = normalizeTimeForDb(finalEnd);
    updates.duration_minutes = timeToMinutes(finalEnd) - timeToMinutes(finalStart);

    if (updates.status === 'CONFIRMED') { updates.confirmed_by_patient = true; updates.confirmed_at = new Date(); }
    else if (updates.status === 'CANCELLED') { updates.cancelled_at = new Date(); if (req.body.cancelled_reason) updates.cancelled_reason = req.body.cancelled_reason; }

    await appointment.update(updates);

    const updated = await Appointment.findByPk(appointment.id, {
      include: [
        { model: Patient, as: 'patient', attributes: ['id','first_name','last_name','phone_primary'], required: false },
        { model: User,    as: 'dentist', attributes: ['id','full_name'],                             required: false }
      ]
    });

    res.json({ message:'Rendez-vous mis à jour', appointment: updated });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error:'Erreur mise à jour rendez-vous', details: extractErrors(error) });
  }
});

// ── PATCH /:id/status ─────────────────────────────────────────────────────────
router.patch('/:id/status', [
  param('id').isUUID(),
  body('status').isIn(APPOINTMENT_STATUSES)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const appointment = await Appointment.findOne({ where: buildWhere(req, { id: req.params.id }) });
    if (!appointment) return res.status(404).json({ error:'Rendez-vous non trouvé' });

    const updates = { status: req.body.status };
    if (req.body.status === 'CONFIRMED') { updates.confirmed_by_patient = true; updates.confirmed_at = new Date(); }
    else if (req.body.status === 'CANCELLED') { updates.cancelled_at = new Date(); if (req.body.cancelled_reason) updates.cancelled_reason = req.body.cancelled_reason; }

    await appointment.update(updates);
    res.json({ message:'Statut mis à jour', appointment });
  } catch (error) {
    res.status(500).json({ error:'Erreur mise à jour statut', details: extractErrors(error) });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ where: buildWhere(req, { id: req.params.id }) });
    if (!appointment) return res.status(404).json({ error:'Rendez-vous non trouvé' });

    await appointment.update({ status:'CANCELLED', cancelled_at: new Date(), cancelled_reason:'Supprimé par utilisateur' });
    res.json({ message:'Rendez-vous supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error:'Erreur suppression rendez-vous', details: extractErrors(error) });
  }
});

// ── GET /availability/:dentist_id ─────────────────────────────────────────────
router.get('/availability/:dentist_id', [
  param('dentist_id').isUUID(),
  query('date').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Paramètres invalides', details: errors.array() });

    const { dentist_id } = req.params;
    const date  = normalizeDateOnly(req.query.date);
    const where = { dentist_id, appointment_date: date, status: { [Op.notIn]: ['CANCELLED','NO_SHOW'] } };
    const clinicId = getClinicId(req);
    if (clinicId && !isSuperAdmin(req)) where.clinic_id = clinicId;

    const existing = await Appointment.findAll({ where, attributes: ['start_time','end_time'], order: [['start_time','ASC']] });

    const slots = [];
    for (let h = 8; h < 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        const slot = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        const isAvailable = !existing.some(a => {
          const s = normalizeTimeHHMM(a.start_time);
          const e = normalizeTimeHHMM(a.end_time);
          return slot >= s && slot < e;
        });
        slots.push({ time: slot, available: isAvailable });
      }
    }

    res.json({ date, dentist_id, working_hours: { start:'08:00', end:'18:00' }, slots, existing_appointments: existing.length });
  } catch (error) {
    res.status(500).json({ error:'Erreur disponibilités', details: extractErrors(error) });
  }
});

// ── GET /:id/export-calendar ──────────────────────────────────────────────────
router.get('/:id/export-calendar', [param('id').isUUID()], async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: buildWhere(req, { id: req.params.id }),
      include: [
        { model: Patient, as: 'patient', required: false },
        { model: User,    as: 'dentist', required: false }
      ]
    });
    if (!appointment) return res.status(404).json({ error:'Rendez-vous non trouvé' });

    const formatDt = (date, time) => {
      const [h, m] = normalizeTimeHHMM(time).split(':').map(Number);
      const d = new Date(typeof date === 'string' ? date : date.toISOString().split('T')[0]);
      d.setUTCHours(h, m, 0, 0);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const patientName = appointment.patient ? `${appointment.patient.first_name} ${appointment.patient.last_name}` : 'Patient';
    const typeMap = { CONSULTATION:'Consultation', TREATMENT:'Traitement', FOLLOW_UP:'Suivi', EMERGENCY:'Urgence', CLEANING:'Nettoyage', CHECK_UP:'Contrôle' };

    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Dental PM Madagascar//\nBEGIN:VEVENT\nUID:${appointment.id}@dentalpm\nDTSTART:${formatDt(appointment.appointment_date, appointment.start_time)}\nDTEND:${formatDt(appointment.appointment_date, appointment.end_time)}\nSUMMARY:${typeMap[appointment.appointment_type]||appointment.appointment_type} - ${patientName}\nEND:VEVENT\nEND:VCALENDAR`;

    res.setHeader('Content-Type','text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition',`attachment; filename="rdv-${patientName.replace(/\s+/g,'-')}.ics"`);
    res.send(ics);
  } catch (error) {
    res.status(500).json({ error:'Erreur export calendrier', details: extractErrors(error) });
  }
});

module.exports = router;
