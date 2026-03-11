const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

function normalizeTimeForDb(value) {
  if (!value) return value;

  const str = String(value).trim();

  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) {
    return str;
  }

  if (/^\d{2}:\d{2}$/.test(str)) {
    return `${str}:00`;
  }

  if (/^\d{1}:\d{2}$/.test(str)) {
    return `0${str}:00`;
  }

  return str;
}

function timeToMinutes(value) {
  if (!value) return null;

  const normalized = String(value).slice(0, 5);
  const [h, m] = normalized.split(':').map(Number);
  return (h * 60) + m;
}

const Appointment = sequelize.define('appointments', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },

  dentist_id: {
    type: DataTypes.UUID,
    allowNull: true
  },

  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true
  },

  appointment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true
    }
  },

  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },

  end_time: {
    type: DataTypes.TIME,
    allowNull: false,
    validate: {
      isAfterStartTime(value) {
        if (!value || !this.start_time) return;

        const startMinutes = timeToMinutes(this.start_time);
        const endMinutes = timeToMinutes(value);

        if (startMinutes === null || endMinutes === null) return;

        if (endMinutes <= startMinutes) {
          throw new Error('end_time doit être après start_time');
        }
      }
    }
  },

  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    validate: {
      min: 1,
      max: 1440
    }
  },

  appointment_type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'CONSULTATION',
    validate: {
      isIn: [[
        'CONSULTATION',
        'TREATMENT',
        'FOLLOW_UP',
        'EMERGENCY',
        'CLEANING',
        'CHECK_UP'
      ]]
    }
  },

  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'SCHEDULED',
    validate: {
      isIn: [[
        'SCHEDULED',
        'CONFIRMED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW',
        'RESCHEDULED'
      ]]
    }
  },

  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  chair_number: {
    type: DataTypes.STRING(20),
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

  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },

  cancelled_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'appointments',
  timestamps: true,
  indexes: [
    { fields: ['patient_id'] },
    { fields: ['dentist_id'] },
    { fields: ['clinic_id'] },
    { fields: ['appointment_date'] },
    { fields: ['status'] },
    { fields: ['clinic_id', 'appointment_date'] },
    { fields: ['dentist_id', 'appointment_date'] }
  ]
});

Appointment.beforeValidate((appointment) => {
  if (appointment.start_time) {
    appointment.start_time = normalizeTimeForDb(appointment.start_time);
  }

  if (appointment.end_time) {
    appointment.end_time = normalizeTimeForDb(appointment.end_time);
  }

  if (appointment.start_time && appointment.end_time) {
    const startMinutes = timeToMinutes(appointment.start_time);
    const endMinutes = timeToMinutes(appointment.end_time);

    if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
      appointment.duration_minutes = endMinutes - startMinutes;
    }
  }
});

module.exports = Appointment;
