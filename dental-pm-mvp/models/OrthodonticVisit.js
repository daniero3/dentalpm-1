'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

module.exports = sequelize.define('orthodontic_visits', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  clinic_id: { type: DataTypes.UUID, allowNull: false },
  case_id: { type: DataTypes.UUID, allowNull: false },
  appointment_id: { type: DataTypes.UUID, allowNull: true },
  visit_date: { type: DataTypes.DATEONLY, allowNull: false },
  next_visit_date: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'orthodontic_visits' });
