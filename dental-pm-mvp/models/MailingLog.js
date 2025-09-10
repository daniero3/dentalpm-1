const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const MailingLog = sequelize.define('mailing_logs', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  campaign_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'mailing_campaigns',
      key: 'id'
    }
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  status: {
    type: DataTypes.ENUM('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED'),
    allowNull: false,
    defaultValue: 'QUEUED'
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  opened_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  clicked_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  bounced_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Message d\'erreur en cas d\'échec'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Métadonnées supplémentaires (IP, user agent, etc.)'
  },
  external_message_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ID du message chez le fournisseur d\'email'
  },
  is_mock: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'True si c\'est un email simulé (développement)'
  }
}, {
  indexes: [
    { fields: ['campaign_id'] },
    { fields: ['patient_id'] },
    { fields: ['email'] },
    { fields: ['status'] },
    { fields: ['sent_at'] },
    { fields: ['opened_at'] },
    { fields: ['clicked_at'] }
  ]
});

// Instance methods
MailingLog.prototype.getStatusLabel = function() {
  const statusLabels = {
    'QUEUED': 'En file d\'attente',
    'SENT': 'Envoyé',
    'DELIVERED': 'Livré',
    'OPENED': 'Ouvert',
    'CLICKED': 'Cliqué',
    'BOUNCED': 'Rejeté',
    'FAILED': 'Échoué'
  };
  return statusLabels[this.status] || this.status;
};

MailingLog.prototype.wasSuccessful = function() {
  return ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(this.status);
};

module.exports = MailingLog;