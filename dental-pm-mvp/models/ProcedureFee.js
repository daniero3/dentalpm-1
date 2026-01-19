const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const ProcedureFee = sequelize.define('procedure_fees', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  schedule_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'pricing_schedules',
      key: 'id'
    }
  },
  procedure_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Code acte (ex: CONS01, EXT01, DET01)'
  },
  label: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Libellé de l\'acte'
  },
  price_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Prix en Ariary'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'GENERAL',
    comment: 'Catégorie: CONSULTATION, EXTRACTION, SOINS, PROTHESE, ORTHODONTIE, CHIRURGIE'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'procedure_fees',
  underscored: true,
  indexes: [
    { fields: ['schedule_id', 'procedure_code'], unique: true },
    { fields: ['schedule_id', 'category'] },
    { fields: ['schedule_id', 'is_active'] }
  ]
});

module.exports = ProcedureFee;
