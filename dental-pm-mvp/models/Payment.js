const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Payment = sequelize.define('payments', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  payment_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Auto-generated: PAY-000001'
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  amount_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Montant payé en Ariary malgache'
  },
  payment_method: {
    type: DataTypes.ENUM(
      'CASH',
      'BANK_TRANSFER', 
      'CHEQUE',
      'MVOLA',
      'ORANGE_MONEY',
      'AIRTEL_MONEY',
      'CARD'
    ),
    allowNull: false
  },
  reference_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Numéro de référence (chèque, virement, mobile money)'
  },
  mobile_money_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Numéro mobile money si applicable'
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Nom de la banque pour virement/chèque'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'COMPLETED'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processed_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for backward compatibility
    references: {
      model: 'clinics',
      key: 'id'
    },
    comment: 'Clinic this payment belongs to (for multi-tenancy)'
  }
}, {
  indexes: [
    { fields: ['invoice_id'] },
    { fields: ['payment_number'] },
    { fields: ['payment_date'] },
    { fields: ['payment_method'] },
    { fields: ['status'] },
    { fields: ['clinic_id'] }
  ]
});

// Instance methods
Payment.prototype.getMethodLabel = function() {
  const methodLabels = {
    'CASH': 'Espèces',
    'BANK_TRANSFER': 'Virement bancaire',
    'CHEQUE': 'Chèque',
    'MVOLA': 'Mvola',
    'ORANGE_MONEY': 'Orange Money',
    'AIRTEL_MONEY': 'Airtel Money',
    'CARD': 'Carte bancaire'
  };
  return methodLabels[this.payment_method] || this.payment_method;
};

Payment.prototype.getStatusLabel = function() {
  const statusLabels = {
    'PENDING': 'En attente',
    'COMPLETED': 'Terminé',
    'FAILED': 'Échoué',
    'CANCELLED': 'Annulé'
  };
  return statusLabels[this.status] || this.status;
};

// Hooks for auto-generating payment number
Payment.beforeCreate(async (payment) => {
  if (!payment.payment_number) {
    try {
      const count = await Payment.count();
      payment.payment_number = `PAY-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      // If count fails (e.g., table doesn't exist yet), use timestamp
      payment.payment_number = `PAY-${Date.now().toString().slice(-6)}`;
    }
  }
});

module.exports = Payment;