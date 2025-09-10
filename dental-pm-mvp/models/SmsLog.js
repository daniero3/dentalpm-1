const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const SmsLog = sequelize.define('sms_logs', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  appointment_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'appointments',
      key: 'id'
    }
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      is: /^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/ // Madagascar phone format
    }
  },
  message_type: {
    type: DataTypes.ENUM(
      'APPOINTMENT_REMINDER',
      'APPOINTMENT_CONFIRMATION',
      'TREATMENT_FOLLOW_UP',
      'INVOICE_NOTIFICATION',
      'PAYMENT_CONFIRMATION',
      'BIRTHDAY_GREETING',
      'CUSTOM'
    ),
    allowNull: false
  },
  message_content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  carrier: {
    type: DataTypes.ENUM('TELMA', 'ORANGE', 'AIRTEL'),
    allowNull: true,
    comment: 'Opérateur mobile malgache'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failed_reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  cost_mga: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: 'Coût du SMS en MGA'
  },
  external_message_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ID du message chez le fournisseur SMS'
  },
  is_mock: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'True si c\'est un SMS simulé (développement)'
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for backward compatibility
    references: {
      model: 'clinics',
      key: 'id'
    },
    comment: 'Clinic this SMS log belongs to (for multi-tenancy)'
  }
}, {
  indexes: [
    { fields: ['patient_id'] },
    { fields: ['appointment_id'] },
    { fields: ['phone_number'] },
    { fields: ['message_type'] },
    { fields: ['status'] },
    { fields: ['sent_at'] },
    { fields: ['clinic_id'] }
  ]
});

// Instance methods
SmsLog.prototype.getMessageTypeLabel = function() {
  const typeLabels = {
    'APPOINTMENT_REMINDER': 'Rappel de RDV',
    'APPOINTMENT_CONFIRMATION': 'Confirmation de RDV',
    'TREATMENT_FOLLOW_UP': 'Suivi de traitement',
    'INVOICE_NOTIFICATION': 'Notification de facture',
    'PAYMENT_CONFIRMATION': 'Confirmation de paiement',
    'BIRTHDAY_GREETING': 'Vœux d\'anniversaire',
    'CUSTOM': 'Message personnalisé'
  };
  return typeLabels[this.message_type] || this.message_type;
};

SmsLog.prototype.getStatusLabel = function() {
  const statusLabels = {
    'PENDING': 'En attente',
    'SENT': 'Envoyé',
    'DELIVERED': 'Livré',
    'FAILED': 'Échoué'
  };
  return statusLabels[this.status] || this.status;
};

module.exports = SmsLog;