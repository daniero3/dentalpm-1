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
    allowNull: false
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  tooth_fdi: {
    type: DataTypes.STRING(2),
    allowNull: false,
    comment: 'FDI notation: 11-18, 21-28, 31-38, 41-48'
  },
  surface: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'M, D, O, B, L, I or combinations'
  },
  status: {
    type: DataTypes.ENUM('HEALTHY', 'CARIES', 'FILLED', 'CROWN', 'MISSING', 'IMPLANT', 'ROOT_CANAL', 'EXTRACTION_NEEDED', 'BRIDGE'),
    defaultValue: 'HEALTHY'
  },
  note: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'tooth_statuses',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['clinic_id', 'patient_id'] },
    { fields: ['clinic_id', 'patient_id', 'tooth_fdi'], unique: true }
  ]
});

module.exports = ToothStatus;
