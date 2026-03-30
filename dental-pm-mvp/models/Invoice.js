const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Invoice = sequelize.define('invoices', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  document_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'INVOICE'
  },
  invoice_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'patients', key: 'id' }
  },
  invoice_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  subtotal_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: { min: 0, max: 100 }
  },
  discount_amount_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  discount_type: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  tax_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  tax_amount_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  total_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  converted_to_invoice_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  validity_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30
  },
  payment_terms: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Payable à réception'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  nif_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  stat_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  clinic_nif: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  clinic_stat: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  created_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,  // ✅ nullable - set par JWT
    references: { model: 'users', key: 'id' }
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true, // ✅ CORRIGÉ: nullable pour SUPER_ADMIN sans clinique
    references: { model: 'clinics', key: 'id' }
  },
  schedule_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'pricing_schedules', key: 'id' }
  }
}, {
  indexes: [
    { fields: ['invoice_number'] },
    { fields: ['patient_id'] },
    { fields: ['status'] },
    { fields: ['invoice_date'] },
    { fields: ['created_by_user_id'] },
    { fields: ['total_mga'] },
    { fields: ['clinic_id'] },
    { fields: ['schedule_id'] },
    { fields: ['document_type'] }
  ]
});

Invoice.prototype.calculateTotals = function() {
  const subtotal = this.subtotal_mga || 0;
  const discountAmount = (subtotal * this.discount_percentage) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * this.tax_percentage) / 100;
  const total = afterDiscount + taxAmount;
  this.discount_amount_mga = discountAmount;
  this.tax_amount_mga = taxAmount;
  this.total_mga = total;
  return { subtotal, discountAmount, taxAmount, total };
};

Invoice.prototype.getStatusLabel = function() {
  const labels = {
    DRAFT: 'Brouillon', SENT: 'Envoyée', PAID: 'Payée',
    PARTIAL: 'Partiellement payée', OVERDUE: 'En retard', CANCELLED: 'Annulée'
  };
  return labels[this.status] || this.status;
};

Invoice.beforeCreate(async (invoice) => {
  if (!invoice.invoice_number) {
    try {
      const count = await Invoice.count();
      const year = new Date().getFullYear();
      invoice.invoice_number = `FACT-${year}-${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      invoice.invoice_number = `FACT-${Date.now().toString().slice(-8)}`;
    }
  }
});

module.exports = Invoice;
