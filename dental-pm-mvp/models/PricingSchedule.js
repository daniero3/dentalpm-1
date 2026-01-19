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
    allowNull: true,  // NULL for global SYNDICAL
    references: {
      model: 'clinics',
      key: 'id'
    },
    comment: 'NULL for global SYNDICAL, clinic UUID for CABINET'
  },
  type: {
    type: DataTypes.ENUM('SYNDICAL', 'CABINET'),
    allowNull: false,
    comment: 'SYNDICAL = tarifs conventionnés (global), CABINET = tarifs libres (per clinic)'
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
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 2026,
    comment: 'Année de validité (ex: 2026)'
  },
  version_code: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: 'Ex: SYNDICAL_2026, CABINET_2026'
  }
}, {
  tableName: 'pricing_schedules',
  underscored: true,
  indexes: [
    { fields: ['type', 'year'], where: { clinic_id: null }, unique: true, name: 'unique_global_syndical' },
    { fields: ['clinic_id', 'type'], unique: true, name: 'unique_clinic_schedule' },
    { fields: ['clinic_id', 'is_active'] }
  ]
});

module.exports = PricingSchedule;
