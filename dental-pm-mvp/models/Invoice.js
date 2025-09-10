const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Invoice = sequelize.define('invoices', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoice_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Auto-generated: FACT-000001'
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  invoice_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date d\'échéance de paiement'
  },
  subtotal_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Sous-total en Ariary malgache'
  },
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  discount_amount_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  discount_type: {
    type: DataTypes.ENUM('SYNDICAL', 'HUMANITARIAN', 'LONG_TERM', 'CUSTOM'),
    allowNull: true,
    comment: 'Type de remise appliquée'
  },
  tax_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'TVA si applicable'
  },
  tax_amount_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  total_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Montant total en Ariary malgache'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  payment_terms: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Payable à réception',
    comment: 'Conditions de paiement'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes ou instructions spéciales'
  },
  // Madagascar-specific fields
  nif_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Numéro d\'Identification Fiscale du patient'
  },
  stat_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Numéro STAT du patient'
  },
  clinic_nif: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'NIF de la clinique'
  },
  clinic_stat: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'STAT de la clinique'
  },
  created_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['invoice_number'] },
    { fields: ['patient_id'] },
    { fields: ['status'] },
    { fields: ['invoice_date'] },
    { fields: ['created_by_user_id'] },
    { fields: ['total_mga'] }
  ]
});

// Instance methods
Invoice.prototype.calculateTotals = function() {
  // This will be called after invoice items are loaded
  const subtotal = this.subtotal_mga || 0;
  const discountAmount = (subtotal * this.discount_percentage) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * this.tax_percentage) / 100;
  const total = afterDiscount + taxAmount;
  
  this.discount_amount_mga = discountAmount;
  this.tax_amount_mga = taxAmount;
  this.total_mga = total;
  
  return {
    subtotal: subtotal,
    discountAmount: discountAmount,
    taxAmount: taxAmount,
    total: total
  };
};

Invoice.prototype.getStatusLabel = function() {
  const statusLabels = {
    'DRAFT': 'Brouillon',
    'SENT': 'Envoyée',
    'PAID': 'Payée',
    'PARTIAL': 'Partiellement payée',
    'OVERDUE': 'En retard',
    'CANCELLED': 'Annulée'
  };
  return statusLabels[this.status] || this.status;
};

// Hooks for auto-generating invoice number
Invoice.beforeCreate(async (invoice) => {
  if (!invoice.invoice_number) {
    try {
      const count = await Invoice.count();
      invoice.invoice_number = `FACT-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      // If count fails (e.g., table doesn't exist yet), use timestamp
      invoice.invoice_number = `FACT-${Date.now().toString().slice(-6)}`;
    }
  }
});

module.exports = Invoice;