const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Appointment, Patient, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get appointments (calendar view)
router.get('/', [
  query('start_date').optional().isDate(),
  query('end_date').optional().isDate(),
  query('dentist_id').optional().isUUID()
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
    const { start_date, end_date, dentist_id, status } = req.query;

    if (start_date && end_date) {
      whereClause.appointment_date = {
        $between: [start_date, end_date]
      };
    } else if (start_date) {
      whereClause.appointment_date = {
        $gte: start_date
      };
    } else if (end_date) {
      whereClause.appointment_date = {
        $lte: end_date
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

// Create new appointment
router.post('/', [
  body('patient_id').isUUID().withMessage('ID patient invalide'),
  body('dentist_id').isUUID().withMessage('ID dentiste invalide'),
  body('appointment_date').isDate().withMessage('Date invalide'),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure de début invalide'),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure de fin invalide'),
  body('appointment_type').isIn(['CONSULTATION', 'TREATMENT', 'FOLLOW_UP', 'EMERGENCY', 'CLEANING', 'CHECK_UP'])
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
      dentist_id,
      appointment_date,
      start_time,
      end_time,
      appointment_type,
      reason,
      notes,
      chair_number
    } = req.body;

    // Verify patient and dentist exist
    const patient = await Patient.findByPk(patient_id);
    const dentist = await User.findByPk(dentist_id);

    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    if (!dentist || dentist.role !== 'DENTIST') {
      return res.status(404).json({ error: 'Dentiste non trouvé' });
    }

    // Calculate duration
    const startTimeMinutes = start_time.split(':').reduce((acc, time) => (60 * acc) + +time);
    const endTimeMinutes = end_time.split(':').reduce((acc, time) => (60 * acc) + +time);
    const duration_minutes = endTimeMinutes - startTimeMinutes;

    if (duration_minutes <= 0) {
      return res.status(400).json({
        error: 'L\'heure de fin doit être après l\'heure de début'
      });
    }

    // Check for conflicts (same dentist, overlapping time)
    const conflictingAppointment = await Appointment.findOne({
      where: {
        dentist_id,
        appointment_date,
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
      }
    });

    if (conflictingAppointment) {
      return res.status(409).json({
        error: 'Conflit d\'horaire avec un autre rendez-vous'
      });
    }

    const appointment = await Appointment.create({
      patient_id,
      dentist_id,
      appointment_date,
      start_time,
      end_time,
      duration_minutes,
      appointment_type,
      reason,
      notes,
      chair_number
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

// Update appointment status
router.patch('/:id/status', [
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

    const { status } = req.body;
    const appointment = await Appointment.findByPk(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        error: 'Rendez-vous non trouvé'
      });
    }

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

// Get appointment availability for a dentist
router.get('/availability/:dentist_id', [
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

    // Get existing appointments for the date
    const existingAppointments = await Appointment.findAll({
      where: {
        dentist_id,
        appointment_date: date,
        status: {
          $notIn: ['CANCELLED', 'NO_SHOW']
        }
      },
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

// Export appointment to calendar (.ics file)
router.get('/:id/export-calendar', [
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

    const appointment = await Appointment.findByPk(req.params.id, {
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
      const appointmentDate = new Date(`${dateStr}T${time}:00.000Z`);
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