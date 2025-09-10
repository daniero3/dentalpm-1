const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const SubscriptionInvoice = sequelize.define('SubscriptionInvoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Generated invoice number (e.g., SUB-2024-0001)'
  },
  
  // Relations
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'clinics',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  subscription_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'subscriptions',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // Invoice details
  invoice_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Payment due date'
  },
  
  // Billing period
  billing_period_start: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  billing_period_end: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  // Plan details (snapshot at time of invoice)
  plan_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  billing_cycle: {
    type: DataTypes.ENUM('MONTHLY', 'QUARTERLY', 'YEARLY'),
    allowNull: false
  },
  
  // Amounts in MGA
  subtotal_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  discount_amount_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  tax_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 20, // TVA 20% Madagascar
    validate: {
      min: 0,
      max: 100
    }
  },
  tax_amount_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  total_mga: {
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
  
  // Payment status
  status: {
    type: DataTypes.ENUM('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'),
    allowNull: false,
    defaultValue: 'DRAFT'
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
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paid_amount_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  
  // PDF and delivery
  pdf_generated: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  pdf_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sent_to_email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  
  // Clinic details (snapshot for PDF generation)
  clinic_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  clinic_address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  clinic_phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  clinic_email: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  clinic_nif: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  clinic_stat: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  clinic_logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Notes and metadata
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional invoice metadata'
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
  tableName: 'subscription_invoices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['invoice_number'], unique: true },
    { fields: ['clinic_id'] },
    { fields: ['subscription_id'] },
    { fields: ['status'] },
    { fields: ['invoice_date'] },
    { fields: ['due_date'] },
    { fields: ['billing_period_start'] },
    { fields: ['billing_period_end'] }
  ]
});

// Instance methods
SubscriptionInvoice.prototype.isOverdue = function() {
  const now = new Date();
  const dueDate = new Date(this.due_date);
  return this.status !== 'PAID' && now > dueDate;
};

SubscriptionInvoice.prototype.getDaysUntilDue = function() {
  const now = new Date();
  const dueDate = new Date(this.due_date);
  const diffTime = dueDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

SubscriptionInvoice.prototype.getDaysOverdue = function() {
  if (!this.isOverdue()) return 0;
  const now = new Date();
  const dueDate = new Date(this.due_date);
  const diffTime = now - dueDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

SubscriptionInvoice.prototype.markAsPaid = function(paymentMethod, paymentReference, paidAmount) {
  this.status = 'PAID';
  this.payment_method = paymentMethod;
  this.payment_reference = paymentReference;
  this.paid_amount_mga = paidAmount || this.total_mga;
  this.paid_at = new Date();
  return this.save();
};

SubscriptionInvoice.prototype.getFormattedTotal = function() {
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(this.total_mga);
};

// Hooks for auto-generating invoice numbers and calculations
SubscriptionInvoice.beforeCreate(async (invoice) => {
  if (!invoice.invoice_number) {
    const currentYear = new Date().getFullYear();
    const count = await SubscriptionInvoice.count({
      where: {
        created_at: {
          [require('sequelize').Op.gte]: new Date(currentYear, 0, 1),
          [require('sequelize').Op.lt]: new Date(currentYear + 1, 0, 1)
        }
      }
    });
    invoice.invoice_number = `SUB-${currentYear}-${String(count + 1).padStart(4, '0')}`;
  }
  
  // Calculate amounts
  const discountAmount = (invoice.subtotal_mga * invoice.discount_percentage) / 100;
  invoice.discount_amount_mga = discountAmount;
  
  const taxableAmount = invoice.subtotal_mga - discountAmount;
  const taxAmount = (taxableAmount * invoice.tax_percentage) / 100;
  invoice.tax_amount_mga = taxAmount;
  
  invoice.total_mga = taxableAmount + taxAmount;
  
  // Set due date (default: 30 days from invoice date)
  if (!invoice.due_date) {
    const dueDate = new Date(invoice.invoice_date);
    dueDate.setDate(dueDate.getDate() + 30);
    invoice.due_date = dueDate;
  }
});

module.exports = SubscriptionInvoice;