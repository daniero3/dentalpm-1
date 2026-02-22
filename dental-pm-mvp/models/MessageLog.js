const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const MessageLog = sequelize.define('message_logs', {
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
  channel: {
    type: DataTypes.ENUM('SMS', 'EMAIL'),
    allowNull: false
  },
  to: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('SENT', 'FAILED'),
    allowNull: false
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  provider_response: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Response from SMS/Email provider (simulated)'
  },
  message_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  queue_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to original queue item'
  }
}, {
  tableName: 'message_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['clinic_id'] },
    { fields: ['patient_id'] },
    { fields: ['channel'] },
    { fields: ['status'] },
    { fields: ['sent_at'] }
  ]
});

module.exports = MessageLog;
