const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Appointment = sequelize.define('appointments', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  dentist_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  appointment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 15,
      max: 480 // 8 hours max
    }
  },
  appointment_type: {
    type: DataTypes.ENUM(
      'CONSULTATION',
      'TREATMENT',
      'FOLLOW_UP',
      'EMERGENCY',
      'CLEANING',
      'CHECK_UP'
    ),
    allowNull: false,
    defaultValue: 'CONSULTATION'
  },
  status: {
    type: DataTypes.ENUM(
      'SCHEDULED',
      'CONFIRMED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
      'RESCHEDULED'
    ),
    allowNull: false,
    defaultValue: 'SCHEDULED'
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Motif de la consultation'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes sur le rendez-vous'
  },
  treatment_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes de traitement après consultation'
  },
  chair_number: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 20
    },
    comment: 'Numéro du fauteuil attribué'
  },
  reminder_sent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Rappel SMS envoyé'
  },
  reminder_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  confirmed_by_patient: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['patient_id'] },
    { fields: ['dentist_id'] },
    { fields: ['appointment_date', 'start_time'] },
    { fields: ['status'] },
    { fields: ['appointment_type'] },
    { fields: ['chair_number'] }
  ]
});

// Instance methods
Appointment.prototype.getStatusLabel = function() {
  const statusLabels = {
    'SCHEDULED': 'Programmé',
    'CONFIRMED': 'Confirmé',
    'IN_PROGRESS': 'En cours',
    'COMPLETED': 'Terminé',
    'CANCELLED': 'Annulé',
    'NO_SHOW': 'Absent',
    'RESCHEDULED': 'Reprogrammé'
  };
  return statusLabels[this.status] || this.status;
};

Appointment.prototype.getTypeLabel = function() {
  const typeLabels = {
    'CONSULTATION': 'Consultation',
    'TREATMENT': 'Traitement',
    'FOLLOW_UP': 'Suivi',
    'EMERGENCY': 'Urgence',
    'CLEANING': 'Nettoyage',
    'CHECK_UP': 'Contrôle'
  };
  return typeLabels[this.appointment_type] || this.appointment_type;
};

Appointment.prototype.getDateTime = function() {
  return new Date(`${this.appointment_date}T${this.start_time}`);
};

module.exports = Appointment;