const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const MailingCampaign = sequelize.define('mailing_campaigns', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100],
      notEmpty: true
    }
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [1, 255],
      notEmpty: true
    }
  },
  body_html: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Contenu HTML de l\'email'
  },
  audience_filter: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Critères de sélection de l\'audience (JSON)'
  },
  audience_description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Description lisible de l\'audience ciblée'
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date/heure d\'envoi programmé'
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date/heure d\'envoi effectif'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  // Statistics
  total_recipients: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  emails_sent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  emails_delivered: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  emails_opened: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  emails_clicked: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  emails_bounced: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  created_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  template_type: {
    type: DataTypes.ENUM(
      'APPOINTMENT_REMINDER',
      'BIRTHDAY_GREETING',
      'FOLLOW_UP',
      'PROMOTIONAL',
      'NEWSLETTER',
      'CUSTOM'
    ),
    allowNull: false,
    defaultValue: 'CUSTOM'
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for backward compatibility
    references: {
      model: 'clinics',
      key: 'id'
    },
    comment: 'Clinic this mailing campaign belongs to (for multi-tenancy)'
  }
}, {
  indexes: [
    { fields: ['status'] },
    { fields: ['scheduled_at'] },
    { fields: ['sent_at'] },
    { fields: ['created_by_user_id'] },
    { fields: ['template_type'] }
  ]
});

// Instance methods
MailingCampaign.prototype.getStatusLabel = function() {
  const statusLabels = {
    'DRAFT': 'Brouillon',
    'SCHEDULED': 'Programmé',
    'SENDING': 'En cours d\'envoi',
    'SENT': 'Envoyé',
    'CANCELLED': 'Annulé'
  };
  return statusLabels[this.status] || this.status;
};

MailingCampaign.prototype.getOpenRate = function() {
  if (this.emails_delivered === 0) return 0;
  return Math.round((this.emails_opened / this.emails_delivered) * 100);
};

MailingCampaign.prototype.getClickRate = function() {
  if (this.emails_delivered === 0) return 0;
  return Math.round((this.emails_clicked / this.emails_delivered) * 100);
};

MailingCampaign.prototype.getBounceRate = function() {
  if (this.emails_sent === 0) return 0;
  return Math.round((this.emails_bounced / this.emails_sent) * 100);
};

MailingCampaign.prototype.getDeliveryRate = function() {
  if (this.emails_sent === 0) return 0;
  return Math.round((this.emails_delivered / this.emails_sent) * 100);
};

module.exports = MailingCampaign;