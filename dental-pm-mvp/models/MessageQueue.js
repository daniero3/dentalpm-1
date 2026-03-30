const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const MessageQueue = sequelize.define('message_queue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true,  // ✅ nullable
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
    allowNull: false,
    defaultValue: 'SMS'
  },
  to: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Phone number or email address'
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When the message should be sent'
  },
  status: {
    type: DataTypes.ENUM('QUEUED', 'SENT', 'FAILED'),
    allowNull: false,
    defaultValue: 'QUEUED'
  },
  message_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'APPT_REMINDER_24H, BIRTHDAY, etc.'
  },
  reference_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Related appointment_id or other reference'
  }
}, {
  tableName: 'message_queue',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['clinic_id'] },
    { fields: ['patient_id'] },
    { fields: ['status'] },
    { fields: ['scheduled_at'] },
    { fields: ['status', 'scheduled_at'] }
  ]
});

module.exports = MessageQueue;
