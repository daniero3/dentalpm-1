'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

module.exports = sequelize.define('orthodontic_cases', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  clinic_id: { type: DataTypes.UUID, allowNull: false },
  patient_id: { type: DataTypes.UUID, allowNull: false },
  dentist_id: { type: DataTypes.UUID, allowNull: true },
  appliance_type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'FIXED' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  expected_end_date: { type: DataTypes.DATEONLY, allowNull: true },
  clinical_notes: { type: DataTypes.TEXT, allowNull: true },
  billing_mode: { type: DataTypes.STRING(20), allowNull: false },
  total_mga: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  upfront_mga: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  monthly_mga: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  months: { type: DataTypes.INTEGER, allowNull: false },
  first_due_date: { type: DataTypes.DATEONLY, allowNull: false },
  global_invoice_id: { type: DataTypes.UUID, allowNull: true }
}, { tableName: 'orthodontic_cases' });
