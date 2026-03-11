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
    validate: { notEmpty: true, len: [2, 100] }
  },
  business_name: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
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
    defaultValue: 'MG'
  },
  nif_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  stat_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  brand_color_primary: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#0EA5E9'
  },
  brand_color_secondary: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#10B981'
  },
  subscription_status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'TRIAL'
  },
  trial_ends_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  current_plan: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  mobile_money_merchant: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mobile_money_number: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  onboarding_completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  max_users: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3
  },
  max_patients: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100
  },
  max_storage_mb: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  created_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true
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
    { fields: ['is_active'] },
    { fields: ['city'] }
  ]
});

Clinic.prototype.isTrialExpired = function() {
  if (this.subscription_status !== 'TRIAL' || !this.trial_ends_at) return false;
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
  if (this.subscription_status !== 'TRIAL' || !this.trial_ends_at) return 0;
  const diffTime = new Date(this.trial_ends_at) - new Date();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

Clinic.beforeCreate(async (clinic) => {
  if (clinic.subscription_status === 'TRIAL') {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    clinic.trial_ends_at = trialEnd;
  }
});

module.exports = Clinic;
