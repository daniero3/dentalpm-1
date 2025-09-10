const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'clinics',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // Plan details
  plan: {
    type: DataTypes.ENUM('ESSENTIAL', 'PRO', 'GROUP'),
    allowNull: false,
    comment: 'Subscription plan type'
  },
  billing_cycle: {
    type: DataTypes.ENUM('MONTHLY', 'QUARTERLY', 'YEARLY'),
    allowNull: false,
    defaultValue: 'MONTHLY'
  },
  
  // Pricing in MGA
  price_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'MGA'
  },
  
  // Subscription period
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('ACTIVE', 'CANCELLED', 'EXPIRED', 'SUSPENDED', 'PENDING'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  
  // Payment details
  payment_method: {
    type: DataTypes.ENUM('CREDIT_CARD', 'MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'BANK_TRANSFER'),
    allowNull: true
  },
  payment_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'External payment reference'
  },
  
  // Auto-renewal
  auto_renew: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  // Discounts
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  discount_reason: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Reason for discount (e.g., syndical member, humanitarian)'
  },
  
  // Features included
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Plan features and limits'
  },
  
  // Cancellation
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Trial conversion
  converted_from_trial: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  trial_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Original trial end date if converted'
  },
  
  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['clinic_id'] },
    { fields: ['plan'] },
    { fields: ['status'] },
    { fields: ['start_date'] },
    { fields: ['end_date'] },
    { fields: ['billing_cycle'] },
    { fields: ['auto_renew'] }
  ]
});

// Instance methods
Subscription.prototype.isActive = function() {
  const now = new Date();
  const endDate = new Date(this.end_date);
  return this.status === 'ACTIVE' && now <= endDate;
};

Subscription.prototype.isExpired = function() {
  const now = new Date();
  const endDate = new Date(this.end_date);
  return now > endDate;
};

Subscription.prototype.getDaysRemaining = function() {
  const now = new Date();
  const endDate = new Date(this.end_date);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

Subscription.prototype.getDiscountedPrice = function() {
  const discountAmount = (this.price_mga * this.discount_percentage) / 100;
  return this.price_mga - discountAmount;
};

Subscription.prototype.shouldRenew = function() {
  return this.auto_renew && this.status === 'ACTIVE' && this.getDaysRemaining() <= 7;
};

// Static methods for plan configuration
Subscription.getPlanConfig = function(plan) {
  const plans = {
    ESSENTIAL: {
      name: 'Essential',
      name_fr: 'Essentiel',
      price_monthly_mga: 50000,
      price_quarterly_mga: 135000,
      price_yearly_mga: 480000,
      max_users: 3,
      max_patients: 100,
      max_storage_mb: 1000,
      features: {
        patient_management: true,
        dental_chart: true,
        invoicing: true,
        basic_reporting: true,
        sms_reminders: false,
        inventory_management: false,
        lab_management: false,
        advanced_reporting: false,
        api_access: false,
        custom_branding: false
      }
    },
    PRO: {
      name: 'Pro',
      name_fr: 'Professionnel',
      price_monthly_mga: 120000,
      price_quarterly_mga: 324000,
      price_yearly_mga: 1152000,
      max_users: 10,
      max_patients: 500,
      max_storage_mb: 5000,
      features: {
        patient_management: true,
        dental_chart: true,
        invoicing: true,
        basic_reporting: true,
        sms_reminders: true,
        inventory_management: true,
        lab_management: true,
        advanced_reporting: true,
        api_access: false,
        custom_branding: true
      }
    },
    GROUP: {
      name: 'Group',
      name_fr: 'Groupe',
      price_monthly_mga: 250000,
      price_quarterly_mga: 675000,
      price_yearly_mga: 2400000,
      max_users: 50,
      max_patients: 2000,
      max_storage_mb: 20000,
      features: {
        patient_management: true,
        dental_chart: true,
        invoicing: true,
        basic_reporting: true,
        sms_reminders: true,
        inventory_management: true,
        lab_management: true,
        advanced_reporting: true,
        api_access: true,
        custom_branding: true,
        multi_location: true,
        dedicated_support: true
      }
    }
  };
  
  return plans[plan] || null;
};

Subscription.getAllPlansConfig = function() {
  return ['ESSENTIAL', 'PRO', 'GROUP'].map(plan => ({
    plan,
    ...Subscription.getPlanConfig(plan)
  }));
};

module.exports = Subscription;