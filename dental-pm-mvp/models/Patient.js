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
    allowNull: false,
    unique: true,
    comment: 'Auto-generated patient number: PAT-000001'
  },
  first_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [1, 50],
      notEmpty: true
    }
  },
  last_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [1, 50],
      notEmpty: true
    }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      isBefore: new Date().toISOString().split('T')[0] // Cannot be in the future
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
    // Removed strict regex validation - handled in route
  },
  phone_secondary: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
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
    allowNull: true, // Made optional
    defaultValue: null
  },
  emergency_contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true, // Made optional
    defaultValue: null
  },
  emergency_contact_relationship: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Époux/épouse, Parent, Enfant, Ami, etc.'
  },
  medical_history: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Antécédents médicaux'
  },
  allergies: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Allergies connues'
  },
  current_medications: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Médicaments actuels'
  },
  insurance_provider: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Assurance maladie (si applicable)'
  },
  insurance_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  payer_type: {
    type: DataTypes.ENUM('INSURED', 'SELF_PAY'),
    allowNull: false,
    defaultValue: 'SELF_PAY',
    comment: 'Type de paiement: INSURED (assuré) ou SELF_PAY (non assuré)'
  },
  occupation: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Profession'
  },
  preferred_language: {
    type: DataTypes.ENUM('FRENCH', 'MALAGASY', 'ENGLISH'),
    allowNull: false,
    defaultValue: 'FRENCH'
  },
  consent_treatment: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Consentement pour les traitements'
  },
  consent_data_processing: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Consentement pour le traitement des données'
  },
  consent_sms_reminders: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Consentement pour les rappels SMS'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes additionnelles'
  },
  created_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: false, // Required for multi-tenancy
    references: {
      model: 'clinics',
      key: 'id'
    },
    comment: 'Clinic this patient belongs to (for multi-tenancy)'
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

// Instance methods
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

// Hooks for auto-generating patient number
Patient.beforeCreate(async (patient) => {
  if (!patient.patient_number) {
    // Use timestamp-based approach to avoid circular dependency
    const timestamp = Date.now().toString();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    patient.patient_number = `PAT-${timestamp.slice(-6)}${randomSuffix}`;
  }
});

module.exports = Patient;