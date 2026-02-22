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
    allowNull: false
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  tooth_fdi: {
    type: DataTypes.STRING(2),
    allowNull: false
  },
  surface: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  note: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'CREATE, UPDATE, TREATMENT'
  },
  performed_by: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'tooth_history',
  timestamps: true,
  underscored: true,
  updatedAt: false
});

module.exports = ToothHistory;
