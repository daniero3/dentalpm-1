'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

module.exports = sequelize.define('orthodontic_dues', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  clinic_id: { type: DataTypes.UUID, allowNull: false },
  case_id: { type: DataTypes.UUID, allowNull: false },
  sequence: { type: DataTypes.INTEGER, allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  amount_mga: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  invoice_id: { type: DataTypes.UUID, allowNull: true }
}, { tableName: 'orthodontic_dues' });
