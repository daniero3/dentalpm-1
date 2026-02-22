const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const MessageTemplate = sequelize.define('message_templates', {
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
  key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Template key: APPT_REMINDER_24H, BIRTHDAY, etc.'
  },
  channel: {
    type: DataTypes.ENUM('SMS', 'EMAIL'),
    allowNull: false,
    defaultValue: 'SMS'
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Template text with placeholders: {patient_name}, {date}, {time}, {clinic_name}'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'message_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['clinic_id', 'key'], unique: true },
    { fields: ['channel'] },
    { fields: ['is_active'] }
  ]
});

module.exports = MessageTemplate;
