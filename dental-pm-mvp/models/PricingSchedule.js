const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const PricingSchedule = sequelize.define('pricing_schedules', {
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
  type: {
    type: DataTypes.ENUM('SYNDICAL', 'CABINET'),
    allowNull: false,
    comment: 'SYNDICAL = tarifs conventionnés, CABINET = tarifs libres'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Ex: Tarification Syndicale, Tarification Cabinet'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Grille par défaut pour les nouveaux patients'
  }
}, {
  tableName: 'pricing_schedules',
  underscored: true,
  indexes: [
    { fields: ['clinic_id', 'type'], unique: true },
    { fields: ['clinic_id', 'is_active'] }
  ]
});

module.exports = PricingSchedule;
