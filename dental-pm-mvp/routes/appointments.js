const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Appointment, Patient, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { requireClinicId } = require('../middleware/clinic');
const { auditLogger } = require('../middleware/auditLogger');
const { requireValidSubscription } = require('../middleware/licensing');
const { Op } = require('sequelize');

// Import messaging helper for appointment reminders
let messagingRouter = null;
try {
  messagingRouter = require('./messaging');
} catch (e) {
  console.log('Messaging module not loaded yet');
}

const router = express.Router();

const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'RESCHEDULED'
];

const APPOINTMENT_TYPES = [
  'CONSULTATION',
  'TREATMENT',
  'FOLLOW_UP',
  'EMERGENCY',
  'CLEANING',
  'CHECK_UP'
];

// -------------------------
// Helpers
// -------------------------
function isSuperAdmin(req) {
  return req.user?.role === 'SUPER_ADMIN';
}

function getCurrentUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

function getCurrentClinicId(req) {
  return req.clinic_id || req.user?.clinic_id || null;
}

function requireClinicOrSuperAdmin(req, res, next) {
  if (isSuperAdmin(req)) return next();
  return requireClinicId(req, res, next);
}

function normalizeDateOnly(value) {
  if (!value) return value;
  return String(value).split('T')[0];
}

function normalizeTimeHHMM(value) {
  if (!value) return value;

  const str = String(value).trim();

  // HH:MM:SS -> HH:MM
  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) {
    return str.slice(0, 5);
  }

  // H:MM -> HH:MM
  if (/^\d{1}:\d{2}$/.test(str)) {
    return `0${str}`;
  }

  // HH:MM -> HH:MM
  if (/^\d{2}:\d{2}$/.test(str)) {
    return str;
  }

  return str;
}

function normalizeTimeForDb(value) {
  const hhmm = normalizeTimeHHMM(value);
  if (!hhmm) return hhmm;
  if (/^\d{2}:\d{2}$/.test(hhmm)) return `${hhmm}:00`;
  return hhmm;
}

function timeToMinutes(value) {
  const hhmm = normalizeTimeHHMM(value);
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60) + m;
}

function buildScopedWhere(req, baseWhere = {}) {
  const where = { ...baseWhere };

  if (!isSuperAdmin(req)) {
    const clinicId = getCurrentClinicId(req);
    where.clinic_id = clinicId;
  }

  return where;
}

function extractErrorDetails(error) {
  if (error?.name === 'SequelizeValidationError' && Array.isArray(error.errors)) {
    return error.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
  }
  return error?.message || null;
}

// All routes require authentication
router.use(authenticateToken);

// All routes require valid subscription
router.use(requireValidSubscription);

// Audit logging for write operations
router.use(auditLogger('appointments'));

// Get appointments (calendar view) - with clinic filtering and date_from/date_to
router.get('/', requireClinicOrSuperAdmin, [
  query('date_from').optional().isISO8601().withMessage('date_from doit être ISO8601'),
  query('date_to').optional().isISO8601().withMessage('date_to doit être ISO8601'),
  query('start_date').optional().isISO8601().withMessage('start_date doit être ISO8601'),
  query('end_date').optional().isISO8601().withMessage('end_date doit être ISO8601'),
  query('dentist_id').optional().isUUID(),
  query('status').optional().isIn(APPOINTMENT_STATUSES)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    let whereClause = buildScopedWhere(req);
    const { date_from, date_to, start_date, end_date, dentist_id, status } = req.query;

    // Date filtering - prefer date_from/date_to, fallback to start_date/end_date
    const fromDate = date_from || start_date;
    const toDate = date_to || end_date;

    if (fromDate && toDate) {
      whereClause.appointment_date = {
        [Op.gte]: normalizeDateOnly(fromDate),
        [Op.lte]: normalizeDateOnly(toDate)
      };
    } else if (fromDate) {
      whereClause.appointment_date = {
        [Op.gte]: normalizeDateOnly(fromDate)
      };
    } else if (toDate) {
      whereClause.appointment_date = {
        [Op.lte]: normalizeDateOnly(toDate)
      };
    }

    if (dentist_id) whereClause.dentist_id = dentist_id;
    if (status) whereClause.status = status;

    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'phone_primary'],
          required: false
        },
        {
          model: User,
          as: 'dentist',
          attributes: ['id', 'full_name', 'specialization'],
          required: false
        }
      ],
      order: [['appointment_date', 'ASC'], ['start_time', 'ASC']]
    });

    return res.json({
      appointments,
      count: appointments.length
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    return res.status(500).json({
      error: 'Erreur lors de la récupération des rendez-vous',
      details: extractErrorDetails(error)
    });
  }
});

// Get single appointment by ID - with clinic check
router.get('/:id', requireClinicOrSuperAdmin, [
  param('id').isUUID().withMessage('ID rendez-vous invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const whereClause = buildScopedWhere(req, { id: req.params.id });

    const appointment = await Appointment.findOne({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'phone_primary', 'email'],
          required: false
        },
        {
          model: User,
          as: 'dentist',
          attributes: ['id', 'full_name', 'specialization'],
          required: false
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Rendez-vous non trouvé'
      });
    }

    return res.json(appointment);
  } catch (error) {
    console.error('Get appointment error:', error);
    return res.status(500).json({
      error: 'Erreur lors de la récupération du rendez-vous',
      details: extractErrorDetails(error)
    });
  }
});

// Create new appointment - dentist_id defaults to current user only if current user is DENTIST
router.post('/', requireClinicOrSuperAdmin, [
  body('patient_id').isUUID().withMessage('ID patient invalide'),
  body('dentist_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('ID dentiste invalide'),
  body('clinic_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('ID clinique invalide'),
  body('appointment_date').isISO8601().withMessage('Date invalide (format ISO8601 requis)'),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Heure de début invalide (format HH:MM)'),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Heure de fin invalide (format HH:MM)'),
  body('appointment_type').isIn(APPOINTMENT_TYPES).withMessage('Type de rendez-vous invalide')
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
      patient_id,
      appointment_date,
      start_time,
      end_time,
      appointment_type,
      reason,
      notes,
      chair_number,
      clinic_id: bodyClinicId
    } = req.body;

    // dentist_id = valeur fournie OU utilisateur courant uniquement s'il est DENTIST
    let dentist_id = req.body.dentist_id || null;
    if (!dentist_id && req.user?.role === 'DENTIST') {
      dentist_id = getCurrentUserId(req);
    }

    // Verify patient exists
    const patientWhere = isSuperAdmin(req)
      ? { id: patient_id }
      : { id: patient_id, clinic_id: getCurrentClinicId(req) };

    const patient = await Patient.findOne({ where: patientWhere });

    if (!patient) {
      return res.status(404).json({
        error: isSuperAdmin(req)
          ? 'Patient non trouvé'
          : 'Patient non trouvé dans cette clinique'
      });
    }

    // Verify dentist exists if provided
    let dentist = null;
    if (dentist_id) {
      const dentistWhere = isSuperAdmin(req)
        ? { id: dentist_id }
        : { id: dentist_id, clinic_id: getCurrentClinicId(req) };

      dentist = await User.findOne({ where: dentistWhere });

      if (!dentist) {
        return res.status(404).json({ error: 'Dentiste/Praticien non trouvé' });
      }
    }

    const normalizedDate = normalizeDateOnly(appointment_date);
    const normalizedStart = normalizeTimeHHMM(start_time);
    const normalizedEnd = normalizeTimeHHMM(end_time);

    // Calculate duration and validate end > start
    const startTimeMinutes = timeToMinutes(normalizedStart);
    const endTimeMinutes = timeToMinutes(normalizedEnd);
    const duration_minutes = endTimeMinutes - startTimeMinutes;

    if (duration_minutes <= 0) {
      return res.status(400).json({
        error: 'end_time doit être après start_time'
      });
    }

    // final clinic_id
    let finalClinicId = null;
    if (isSuperAdmin(req)) {
      finalClinicId = bodyClinicId || patient.clinic_id || null;
    } else {
      finalClinicId = getCurrentClinicId(req);
    }

    // Check for conflicts (same dentist, overlapping time)
    if (dentist_id) {
      const conflictWhere = {
        dentist_id,
        appointment_date: normalizedDate,
        status: {
          [Op.notIn]: ['CANCELLED', 'NO_SHOW']
        },
        [Op.and]: [
          { start_time: { [Op.lt]: normalizeTimeForDb(normalizedEnd) } },
          { end_time: { [Op.gt]: normalizeTimeForDb(normalizedStart) } }
        ]
      };

      if (finalClinicId) {
        conflictWhere.clinic_id = finalClinicId;
      }

      const conflictingAppointment = await Appointment.findOne({
        where: conflictWhere
      });

      if (conflictingAppointment) {
        return res.status(409).json({
          error: 'Conflit d\'horaire avec un autre rendez-vous'
        });
      }
    }

    const appointment = await Appointment.create({
      patient_id,
      dentist_id,
      appointment_date: normalizedDate,
      start_time: normalizeTimeForDb(normalizedStart),
      end_time: normalizeTimeForDb(normalizedEnd),
      duration_minutes,
      appointment_type,
      reason: reason || null,
      notes: notes || null,
      chair_number: chair_number || null,
      clinic_id: finalClinicId
    });

    // Fetch complete appointment with relations
    const completeAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'phone_primary'],
          required: false
        },
        {
          model: User,
          as: 'dentist',
          attributes: ['id', 'full_name'],
          required: false
        }
      ]
    });

    res.status(201).json({
      message: 'Rendez-vous créé avec succès',
      appointment: completeAppointment
    });

    // Create SMS reminder T-24h (async, don't block response)
    if (messagingRouter?.createAppointmentReminder) {
      messagingRouter.createAppointmentReminder(appointment, finalClinicId).catch(e => {
        console.error('Failed to create appointment reminder:', e);
      });
    }
  } catch (error) {
    console.error('Create appointment error:', error);
    return res.status(500).json({
      error: 'Erreur lors de la création du rendez-vous',
      details: extractErrorDetails(error)
    });
  }
});

// Update appointment - with full clinic check
router.put('/:id', requireClinicOrSuperAdmin, [
  param('id').isUUID().withMessage('ID rendez-vous invalide'),
  body('dentist_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('ID dentiste invalide'),
  body('appointment_date').optional().isISO8601().withMessage('Date invalide'),
  body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Heure de début invalide'),
  body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Heure de fin invalide'),
  body('appointment_type').optional().isIn(APPOINTMENT_TYPES),
  body('status').optional().isIn(APPOINTMENT_STATUSES),
  body('clinic_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('ID clinique invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const whereClause = buildScopedWhere(req, { id: req.params.id });
    const appointment = await Appointment.findOne({ where: whereClause });

    if (!appointment) {
      return res.status(404).json({
        error: 'Rendez-vous non trouvé'
      });
    }

    // Prepare update data
    const updateData = {};
    const allowedFields = [
      'dentist_id',
      'appointment_date',
      'start_time',
      'end_time',
      'appointment_type',
      'reason',
      'notes',
      'chair_number',
      'status'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'appointment_date') {
          updateData[field] = normalizeDateOnly(req.body[field]);
        } else if (field === 'start_time' || field === 'end_time') {
          updateData[field] = normalizeTimeHHMM(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    // SUPER_ADMIN can change clinic_id; others remain scoped to their clinic
    if (Object.prototype.hasOwnProperty.call(req.body, 'clinic_id')) {
      if (isSuperAdmin(req)) {
        updateData.clinic_id = req.body.clinic_id || null;
      }
    }

    // Validate dentist if changed
    const dentistIdToUse = Object.prototype.hasOwnProperty.call(updateData, 'dentist_id')
      ? updateData.dentist_id
      : appointment.dentist_id;

    if (dentistIdToUse) {
      const dentistWhere = isSuperAdmin(req)
        ? { id: dentistIdToUse }
        : { id: dentistIdToUse, clinic_id: getCurrentClinicId(req) };

      const dentist = await User.findOne({ where: dentistWhere });
      if (!dentist) {
        return res.status(404).json({ error: 'Dentiste/Praticien non trouvé' });
      }
    }

    const finalDate = updateData.appointment_date || appointment.appointment_date;
    const finalStart = updateData.start_time || normalizeTimeHHMM(appointment.start_time);
    const finalEnd = updateData.end_time || normalizeTimeHHMM(appointment.end_time);

    const startMinutes = timeToMinutes(finalStart);
    const endMinutes = timeToMinutes(finalEnd);

    if (endMinutes <= startMinutes) {
      return res.status(400).json({
        error: 'end_time doit être après start_time'
      });
    }

    updateData.start_time = normalizeTimeForDb(finalStart);
    updateData.end_time = normalizeTimeForDb(finalEnd);
    updateData.duration_minutes = endMinutes - startMinutes;

    const finalClinicId = Object.prototype.hasOwnProperty.call(updateData, 'clinic_id')
      ? updateData.clinic_id
      : appointment.clinic_id;

    // Conflict check on update
    if (dentistIdToUse) {
      const conflictWhere = {
        id: { [Op.ne]: appointment.id },
        dentist_id: dentistIdToUse,
        appointment_date: normalizeDateOnly(finalDate),
        status: {
          [Op.notIn]: ['CANCELLED', 'NO_SHOW']
        },
        [Op.and]: [
          { start_time: { [Op.lt]: updateData.end_time } },
          { end_time: { [Op.gt]: updateData.start_time } }
        ]
      };

      if (finalClinicId) {
        conflictWhere.clinic_id = finalClinicId;
      }

      const conflictingAppointment = await Appointment.findOne({ where: conflictWhere });

      if (conflictingAppointment) {
        return res.status(409).json({
          error: 'Conflit d\'horaire avec un autre rendez-vous'
        });
      }
    }

    // Handle status-specific updates
    if (updateData.status === 'CONFIRMED') {
      updateData.confirmed_by_patient = true;
      updateData.confirmed_at = new Date();
    } else if (updateData.status === 'CANCELLED') {
      updateData.cancelled_at = new Date();
      if (req.body.cancelled_reason) {
        updateData.cancelled_reason = req.body.cancelled_reason;
      }
    }

    await appointment.update(updateData);

    // Fetch updated appointment with relations
    const updatedAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'phone_primary'],
          required: false
        },
        {
          model: User,
          as: 'dentist',
          attributes: ['id', 'full_name'],
          required: false
        }
      ]
    });

    return res.json({
      message: 'Rendez-vous mis à jour',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    return res.status(500).json({
      error: 'Erreur lors de la mise à jour du rendez-vous',
      details: extractErrorDetails(error)
    });
  }
});

// Update appointment status - with clinic check
router.patch('/:id/status', requireClinicOrSuperAdmin, [
  param('id').isUUID().withMessage('ID rendez-vous invalide'),
  body('status').isIn(APPOINTMENT_STATUSES)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const whereClause = buildScopedWhere(req, { id: req.params.id });
    const appointment = await Appointment.findOne({ where: whereClause });

    if (!appointment) {
      return res.status(404).json({
        error: 'Rendez-vous non trouvé'
      });
    }

    const { status } = req.body;
    const updateData = { status };

    if (status === 'CONFIRMED') {
      updateData.confirmed_by_patient = true;
      updateData.confirmed_at = new Date();
    } else if (status === 'CANCELLED') {
      updateData.cancelled_at = new Date();
      if (req.body.cancelled_reason) {
        updateData.cancelled_reason = req.body.cancelled_reason;
      }
    }

    await appointment.update(updateData);

    return res.json({
      message: 'Statut du rendez-vous mis à jour',
      appointment
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    return res.status(500).json({
      error: 'Erreur lors de la mise à jour du statut',
      details: extractErrorDetails(error)
    });
  }
});

// Delete appointment - with clinic check
router.delete('/:id', requireClinicOrSuperAdmin, [
  param('id').isUUID().withMessage('ID rendez-vous invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const whereClause = buildScopedWhere(req, { id: req.params.id });
    const appointment = await Appointment.findOne({ where: whereClause });

    if (!appointment) {
      return res.status(404).json({
        error: 'Rendez-vous non trouvé'
      });
    }

    // Soft delete by setting status to CANCELLED
    await appointment.update({
      status: 'CANCELLED',
      cancelled_at: new Date(),
      cancelled_reason: 'Supprimé par utilisateur'
    });

    return res.json({
      message: 'Rendez-vous supprimé avec succès'
    });
  } catch (error) {
    console.error('Delete appointment error:', error);
    return res.status(500).json({
      error: 'Erreur lors de la suppression du rendez-vous',
      details: extractErrorDetails(error)
    });
  }
});

// Get appointment availability for a dentist
router.get('/availability/:dentist_id', requireClinicOrSuperAdmin, [
  param('dentist_id').isUUID().withMessage('ID dentiste invalide'),
  query('date').isISO8601().withMessage('Date invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const { dentist_id } = req.params;
    const date = normalizeDateOnly(req.query.date);

    const whereClause = {
      dentist_id,
      appointment_date: date,
      status: {
        [Op.notIn]: ['CANCELLED', 'NO_SHOW']
      }
    };

    if (!isSuperAdmin(req)) {
      whereClause.clinic_id = getCurrentClinicId(req);
    }

    const existingAppointments = await Appointment.findAll({
      where: whereClause,
      attributes: ['start_time', 'end_time'],
      order: [['start_time', 'ASC']]
    });

    // Define working hours (8:00 AM to 6:00 PM)
    const workingHours = {
      start: '08:00',
      end: '18:00'
    };

    // Generate 30-minute time slots
    const timeSlots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeSlot = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        timeSlots.push(timeSlot);
      }
    }

    // Mark unavailable slots
    const availability = timeSlots.map(slot => {
      const isAvailable = !existingAppointments.some(appointment => {
        const apptStart = normalizeTimeHHMM(appointment.start_time);
        const apptEnd = normalizeTimeHHMM(appointment.end_time);
        return slot >= apptStart && slot < apptEnd;
      });

      return {
        time: slot,
        available: isAvailable
      };
    });

    return res.json({
      date,
      dentist_id,
      working_hours: workingHours,
      slots: availability,
      existing_appointments: existingAppointments.length
    });
  } catch (error) {
    console.error('Get availability error:', error);
    return res.status(500).json({
      error: 'Erreur lors de la récupération des disponibilités',
      details: extractErrorDetails(error)
    });
  }
});

// Export appointment to calendar (.ics file) - with clinic check
router.get('/:id/export-calendar', requireClinicOrSuperAdmin, [
  param('id').isUUID().withMessage('ID rendez-vous invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const whereClause = buildScopedWhere(req, { id: req.params.id });

    const appointment = await Appointment.findOne({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'phone_primary', 'email'],
          required: false
        },
        {
          model: User,
          as: 'dentist',
          attributes: ['id', 'full_name', 'specialization'],
          required: false
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Rendez-vous non trouvé'
      });
    }

    const formatDate = (date, time) => {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
      const hhmm = normalizeTimeHHMM(time);
      const [hours, minutes] = hhmm.split(':').map(t => parseInt(t, 10));

      const appointmentDate = new Date(dateStr);
      appointmentDate.setUTCHours(hours, minutes, 0, 0);

      return appointmentDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDateTime = formatDate(appointment.appointment_date, appointment.start_time);
    const endDateTime = formatDate(appointment.appointment_date, appointment.end_time);
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const patientName = appointment.patient
      ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
      : 'Patient';

    const dentistName = appointment.dentist?.full_name || 'Praticien non assigné';

    const appointmentTypeMap = {
      CONSULTATION: 'Consultation',
      TREATMENT: 'Traitement',
      FOLLOW_UP: 'Suivi',
      EMERGENCY: 'Urgence',
      CLEANING: 'Nettoyage',
      CHECK_UP: 'Contrôle'
    };

    const typeLabel = appointmentTypeMap[appointment.appointment_type] || appointment.appointment_type;

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Dental PM Madagascar//Appointment//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:appointment-${appointment.id}@dental-madagascar.mg
DTSTART:${startDateTime}
DTEND:${endDateTime}
DTSTAMP:${now}
SUMMARY:${typeLabel} - ${patientName}
DESCRIPTION:Rendez-vous dentaire\\n\\nPatient: ${patientName}\\nType: ${typeLabel}\\nDentiste: ${dentistName}${appointment.reason ? `\\nMotif: ${appointment.reason}` : ''}${appointment.notes ? `\\nNotes: ${appointment.notes}` : ''}${appointment.patient?.phone_primary ? `\\nTéléphone: ${appointment.patient.phone_primary}` : ''}\\n\\nClinique Dentaire Madagascar
LOCATION:Clinique Dentaire Madagascar${appointment.chair_number ? ` - Fauteuil ${appointment.chair_number}` : ''}
STATUS:CONFIRMED
TRANSP:OPAQUE
BEGIN:VALARM
TRIGGER:-PT30M
DESCRIPTION:Rappel rendez-vous dentaire
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rdv-${patientName.replace(/\s+/g, '-')}-${appointment.appointment_date}.ics"`);

    return res.send(icsContent);
  } catch (error) {
    console.error('Export calendar error:', error);
    return res.status(500).json({
      error: 'Erreur lors de l\'export du calendrier',
      details: extractErrorDetails(error)
    });
  }
});

module.exports = router;
