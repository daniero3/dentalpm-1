const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const ToothHistory = sequelize.define('ToothHistory', {
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
    allowNull: true,
    defaultValue: 'HEALTHY'
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  performed_by: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'tooth_histories',
  timestamps: true,
  underscored: true,
  updatedAt: false
});

module.exports = ToothHistory;
