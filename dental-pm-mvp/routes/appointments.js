const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Appointment, Patient, User } = require('../models');
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
router.use(auditLogger('appointments'));

// Get appointments (calendar view) - with clinic filtering and date_from/date_to
router.get('/', requireClinicId, [
  query('date_from').optional().isISO8601().withMessage('date_from doit être ISO8601'),
  query('date_to').optional().isISO8601().withMessage('date_to doit être ISO8601'),
  query('start_date').optional().isDate(), // Legacy support
  query('end_date').optional().isDate(),   // Legacy support
  query('dentist_id').optional().isUUID(),
  query('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    let whereClause = {};
    const { date_from, date_to, start_date, end_date, dentist_id, status } = req.query;

    // Apply clinic filtering (mandatory)
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }

    // Date filtering - prefer date_from/date_to, fallback to start_date/end_date
    const fromDate = date_from || start_date;
    const toDate = date_to || end_date;

    if (fromDate && toDate) {
      whereClause.appointment_date = {
        [Op.gte]: fromDate.split('T')[0],
        [Op.lte]: toDate.split('T')[0]
      };
    } else if (fromDate) {
      whereClause.appointment_date = {
        [Op.gte]: fromDate.split('T')[0]
      };
    } else if (toDate) {
      whereClause.appointment_date = {
        [Op.lte]: toDate.split('T')[0]
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
          attributes: ['id', 'first_name', 'last_name', 'phone_primary']
        },
        {
          model: User,
          as: 'dentist',
          attributes: ['id', 'full_name', 'specialization']
        }
      ],
      order: [['appointment_date', 'ASC'], ['start_time', 'ASC']]
    });

    res.json({
      appointments,
      count: appointments.length
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des rendez-vous'
    });
  }
});

// Get single appointment by ID - with clinic check
router.get('/:id', requireClinicId, [
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

    // Find with clinic filtering
    let whereClause = { id: req.params.id };
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }

    const appointment = await Appointment.findOne({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'phone_primary', 'email']
        },
        {
          model: User,
          as: 'dentist',
          attributes: ['id', 'full_name', 'specialization']
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Rendez-vous non trouvé'
      });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du rendez-vous'
    });
  }
});

// Create new appointment - dentist_id defaults to current user if not provided
router.post('/', requireClinicId, [
  body('patient_id').isUUID().withMessage('ID patient invalide'),
  body('dentist_id').optional().isUUID().withMessage('ID dentiste invalide'),
  body('appointment_date').isISO8601().withMessage('Date invalide (format ISO8601 requis)'),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure de début invalide (format HH:MM)'),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure de fin invalide (format HH:MM)'),
  body('appointment_type').isIn(['CONSULTATION', 'TREATMENT', 'FOLLOW_UP', 'EMERGENCY', 'CLEANING', 'CHECK_UP']).withMessage('Type de rendez-vous invalide')
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
      chair_number
    } = req.body;

    // Stratégie: dentist_id = valeur fournie OU user.id courant par défaut
    const dentist_id = req.body.dentist_id || req.user.id;

    // Verify patient exists and belongs to same clinic
    let patientWhere = { id: patient_id };
    if (req.clinic_id) {
      patientWhere.clinic_id = req.clinic_id;
    }
    const patient = await Patient.findOne({ where: patientWhere });

    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé dans cette clinique' });
    }

    // Verify dentist exists (can be any role that can perform appointments)
    const dentist = await User.findByPk(dentist_id);
    if (!dentist) {
      return res.status(404).json({ error: 'Dentiste/Praticien non trouvé' });
    }

    // Calculate duration and validate end > start
    const startTimeMinutes = start_time.split(':').reduce((acc, time) => (60 * acc) + +time, 0);
    const endTimeMinutes = end_time.split(':').reduce((acc, time) => (60 * acc) + +time, 0);
    const duration_minutes = endTimeMinutes - startTimeMinutes;

    if (duration_minutes <= 0) {
      return res.status(400).json({
        error: 'end_time doit être après start_time'
      });
    }

    // Check for conflicts (same dentist, overlapping time, same clinic)
    let conflictWhere = {
      dentist_id,
      appointment_date: appointment_date.split('T')[0],
      status: {
        [Op.notIn]: ['CANCELLED', 'NO_SHOW']
      },
      [Op.or]: [
        {
          start_time: {
            [Op.between]: [start_time, end_time]
          }
        },
        {
          end_time: {
            [Op.between]: [start_time, end_time]
          }
        },
        {
          [Op.and]: [
            { start_time: { [Op.lte]: start_time } },
            { end_time: { [Op.gte]: end_time } }
          ]
        }
      ]
    };
    if (req.clinic_id) {
      conflictWhere.clinic_id = req.clinic_id;
    }

    const conflictingAppointment = await Appointment.findOne({
      where: conflictWhere
    });

    if (conflictingAppointment) {
      return res.status(409).json({
        error: 'Conflit d\'horaire avec un autre rendez-vous'
      });
    }

    const appointment = await Appointment.create({
      patient_id,
      dentist_id,
      appointment_date: appointment_date.split('T')[0],
      start_time,
      end_time,
      duration_minutes,
      appointment_type,
      reason,
      notes,
      chair_number,
      clinic_id: req.clinic_id
    });

    // Fetch complete appointment with relations
    const completeAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'phone_primary']
        },
        {
          model: User,
          as: 'dentist',
          attributes: ['id', 'full_name']
        }
      ]
    });

    res.status(201).json({
      message: 'Rendez-vous créé avec succès',
      appointment: completeAppointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du rendez-vous'
    });
  }
});

// Update appointment - with full clinic check
router.put('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID rendez-vous invalide'),
  body('dentist_id').optional().isUUID().withMessage('ID dentiste invalide'),
  body('appointment_date').optional().isISO8601().withMessage('Date invalide'),
  body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure de début invalide'),
  body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure de fin invalide'),
  body('appointment_type').optional().isIn(['CONSULTATION', 'TREATMENT', 'FOLLOW_UP', 'EMERGENCY', 'CLEANING', 'CHECK_UP']),
  body('status').optional().isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    // Find with clinic filtering
    let whereClause = { id: req.params.id };
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }

    const appointment = await Appointment.findOne({ where: whereClause });

    if (!appointment) {
      return res.status(404).json({
        error: 'Rendez-vous non trouvé'
      });
    }

    // Prepare update data
    const updateData = {};
    const allowedFields = ['dentist_id', 'appointment_date', 'start_time', 'end_time', 'appointment_type', 'reason', 'notes', 'chair_number', 'status'];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'appointment_date') {
          updateData[field] = req.body[field].split('T')[0];
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    // Validate time if both are being updated
    const newStartTime = updateData.start_time || appointment.start_time;
    const newEndTime = updateData.end_time || appointment.end_time;
    
    const startMinutes = newStartTime.split(':').reduce((acc, t) => (60 * acc) + +t, 0);
    const endMinutes = newEndTime.split(':').reduce((acc, t) => (60 * acc) + +t, 0);
    
    if (endMinutes <= startMinutes) {
      return res.status(400).json({
        error: 'end_time doit être après start_time'
      });
    }

    updateData.duration_minutes = endMinutes - startMinutes;

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
          attributes: ['id', 'first_name', 'last_name', 'phone_primary']
        },
        {
          model: User,
          as: 'dentist',
          attributes: ['id', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Rendez-vous mis à jour',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du rendez-vous'
    });
  }
});

// Update appointment status - with clinic check
router.patch('/:id/status', requireClinicId, [
  param('id').isUUID().withMessage('ID rendez-vous invalide'),
  body('status').isIn(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    // Find with clinic filtering
    let whereClause = { id: req.params.id };
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }

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

    res.json({
      message: 'Statut du rendez-vous mis à jour',
      appointment
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du statut'
    });
  }
});

// Delete appointment - with clinic check
router.delete('/:id', requireClinicId, [
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

    // Find with clinic filtering
    let whereClause = { id: req.params.id };
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }

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

    res.json({
      message: 'Rendez-vous supprimé avec succès'
    });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du rendez-vous'
    });
  }
});

// Get appointment availability for a dentist
router.get('/availability/:dentist_id', requireClinicId, [
  param('dentist_id').isUUID().withMessage('ID dentiste invalide'),
  query('date').isDate().withMessage('Date invalide')
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
    const { date } = req.query;

    // Get existing appointments for the date - filtered by clinic
    let whereClause = {
      dentist_id,
      appointment_date: date,
      status: {
        [Op.notIn]: ['CANCELLED', 'NO_SHOW']
      }
    };
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
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
        return slot >= appointment.start_time && slot < appointment.end_time;
      });

      return {
        time: slot,
        available: isAvailable
      };
    });

    res.json({
      date,
      dentist_id,
      working_hours: workingHours,
      slots: availability,
      existing_appointments: existingAppointments.length
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des disponibilités'
    });
  }
});

// Export appointment to calendar (.ics file) - with clinic check
router.get('/:id/export-calendar', requireClinicId, [
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

    // Find with clinic filtering
    let whereClause = { id: req.params.id };
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }

    const appointment = await Appointment.findOne({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'phone_primary', 'email']
        },
        {
          model: User,
          as: 'dentist',
          attributes: ['id', 'full_name', 'specialization']
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Rendez-vous non trouvé'
      });
    }

    // Generate ICS content (RFC 5545 compliant)
    const formatDate = (date, time) => {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
      
      // Parse time (format "H:MM" or "HH:MM")
      const [hours, minutes] = time.split(':').map(t => parseInt(t, 10));
      
      const appointmentDate = new Date(dateStr);
      appointmentDate.setUTCHours(hours, minutes, 0, 0);
      
      return appointmentDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDateTime = formatDate(appointment.appointment_date, appointment.start_time);
    const endDateTime = formatDate(appointment.appointment_date, appointment.end_time);
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const patientName = `${appointment.patient.first_name} ${appointment.patient.last_name}`;
    const dentistName = appointment.dentist.full_name;
    const appointmentTypeMap = {
      'CONSULTATION': 'Consultation',
      'TREATMENT': 'Traitement',
      'FOLLOW_UP': 'Suivi',
      'EMERGENCY': 'Urgence',
      'CLEANING': 'Nettoyage',
      'CHECK_UP': 'Contrôle'
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
DESCRIPTION:Rendez-vous dentaire\\n\\nPatient: ${patientName}\\nType: ${typeLabel}\\nDentiste: ${dentistName}${appointment.reason ? `\\nMotif: ${appointment.reason}` : ''}${appointment.notes ? `\\nNotes: ${appointment.notes}` : ''}\\nTéléphone: ${appointment.patient.phone_primary || 'Non renseigné'}\\n\\nClinique Dentaire Madagascar
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

    // Set headers for file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rdv-${patientName.replace(/\s+/g, '-')}-${appointment.appointment_date}.ics"`);
    
    res.send(icsContent);

  } catch (error) {
    console.error('Export calendar error:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'export du calendrier'
    });
  }
});

module.exports = router;
