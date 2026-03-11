const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Patient = sequelize.define('patients', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patient_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  first_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { len: [1, 50], notEmpty: true }
  },
  last_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { len: [1, 50], notEmpty: true }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      isBefore(value) {
        const today = new Date().toISOString().split('T')[0];
        if (value >= today) {
          throw new Error('La date de naissance doit être dans le passé');
        }
      }
    }
  },
  gender: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      isIn: [['male', 'female', 'other', 'MALE', 'FEMALE', 'OTHER', 'M', 'F']]
    }
  },
  phone_primary: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  phone_secondary: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmailOrEmpty(value) {
        if (value && value.trim() !== '') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error('Email invalide');
          }
        }
      }
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Antananarivo'
  },
  postal_code: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  emergency_contact_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  emergency_contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null
  },
  emergency_contact_relationship: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  medical_history: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  allergies: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  current_medications: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  insurance_provider: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  insurance_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  payer_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'SELF_PAY'
  },
  occupation: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  preferred_language: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'FRENCH'
  },
  consent_treatment: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  consent_data_processing: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  consent_sms_reminders: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'clinics', key: 'id' }
  }
}, {
  indexes: [
    { fields: ['patient_number'] },
    { fields: ['last_name', 'first_name'] },
    { fields: ['phone_primary'] },
    { fields: ['email'] },
    { fields: ['is_active'] },
    { fields: ['created_by_user_id'] },
    { fields: ['clinic_id'] }
  ]
});

Patient.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`;
};

Patient.prototype.getAge = function() {
  const today = new Date();
  const birthDate = new Date(this.date_of_birth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

Patient.beforeCreate(async (patient) => {
  if (!patient.patient_number) {
    const timestamp = Date.now().toString();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    patient.patient_number = `PAT-${timestamp.slice(-6)}${randomSuffix}`;
  }
});

module.exports = Patient;
