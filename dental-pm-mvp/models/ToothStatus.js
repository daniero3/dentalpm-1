const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const ToothStatus = sequelize.define('ToothStatus', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  tooth_fdi: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  surface: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(30),
    defaultValue: 'HEALTHY'
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'tooth_statuses',
  timestamps: true,
  underscored: true
});

module.exports = ToothStatus;
