const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Clinic = sequelize.define('Clinic', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  business_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
    comment: 'Official business/legal name'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      matches: /^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 500]
    }
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Antananarivo'
  },
  postal_code: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(2),
    allowNull: false,
    defaultValue: 'MG',
    comment: 'ISO country code'
  },
  
  // Madagascar tax information
  nif_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    comment: 'Numéro d\'Identification Fiscale'
  },
  stat_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    comment: 'Numéro statistique'
  },
  
  // Branding
  logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  brand_color_primary: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#0EA5E9',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  },
  brand_color_secondary: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#10B981',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  },
  
  // Subscription info
  subscription_status: {
    type: DataTypes.ENUM('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'),
    allowNull: false,
    defaultValue: 'TRIAL'
  },
  trial_ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the trial period ends'
  },
  current_plan: {
    type: DataTypes.ENUM('ESSENTIAL', 'PRO', 'GROUP'),
    allowNull: true,
    comment: 'Current subscription plan'
  },
  
  // Mobile Money config
  mobile_money_merchant: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Mobile Money merchant name for payments'
  },
  mobile_money_number: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: 'Mobile Money number for receiving payments'
  },
  
  // Onboarding
  onboarding_completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  // Limits based on plan
  max_users: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    comment: 'Maximum number of users allowed'
  },
  max_patients: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    comment: 'Maximum number of patients allowed'
  },
  max_storage_mb: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000,
    comment: 'Maximum storage in MB'
  },
  
  // Status
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Email verification status'
  },
  
  // Metadata
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Clinic-specific settings and preferences'
  },
  
  // Tracking
  created_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  last_activity_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'clinics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['email'] },
    { fields: ['subscription_status'] },
    { fields: ['current_plan'] },
    { fields: ['is_active'] },
    { fields: ['city'] },
    { fields: ['nif_number'], unique: true, where: { nif_number: { [require('sequelize').Op.ne]: null } } },
    { fields: ['stat_number'], unique: true, where: { stat_number: { [require('sequelize').Op.ne]: null } } }
  ]
});

// Instance methods
Clinic.prototype.isTrialExpired = function() {
  if (this.subscription_status !== 'TRIAL' || !this.trial_ends_at) {
    return false;
  }
  return new Date() > new Date(this.trial_ends_at);
};

Clinic.prototype.isSubscriptionActive = function() {
  return ['TRIAL', 'ACTIVE'].includes(this.subscription_status) && 
         (this.subscription_status !== 'TRIAL' || !this.isTrialExpired());
};

Clinic.prototype.canAddUsers = function(currentUserCount) {
  return currentUserCount < this.max_users;
};

Clinic.prototype.canAddPatients = function(currentPatientCount) {
  return currentPatientCount < this.max_patients;
};

Clinic.prototype.getRemainingTrialDays = function() {
  if (this.subscription_status !== 'TRIAL' || !this.trial_ends_at) {
    return 0;
  }
  const now = new Date();
  const trialEnd = new Date(this.trial_ends_at);
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Hooks
Clinic.beforeCreate(async (clinic) => {
  // Set trial end date (14 days from now)
  if (clinic.subscription_status === 'TRIAL') {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    clinic.trial_ends_at = trialEnd;
  }
});

module.exports = Clinic;