const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Procedure = sequelize.define('procedures', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Code procédure (ex: CONS-001, OBTU-001)'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM(
      'CONSULTATION',
      'PREVENTION',
      'RESTORATION', 
      'ENDODONTICS',
      'PERIODONTICS',
      'ORAL_SURGERY',
      'ORTHODONTICS',
      'PROSTHETICS',
      'AESTHETIC',
      'PEDIATRIC',
      'EMERGENCY'
    ),
    allowNull: false
  },
  default_price_mga: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Prix par défaut en Ariary malgache'
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 5,
      max: 480 // 8 hours max
    },
    comment: 'Durée estimée en minutes'
  },
  requires_anesthesia: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  requires_xray: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Ordre d\'affichage'
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for global procedures, specific value for clinic-specific procedures
    references: {
      model: 'clinics',
      key: 'id'
    },
    comment: 'Clinic this procedure belongs to (null = global procedure available to all clinics)'
  }
}, {
  indexes: [
    { fields: ['code'] },
    { fields: ['category'] },
    { fields: ['is_active'] },
    { fields: ['sort_order'] }
  ]
});

// Instance methods
Procedure.prototype.getCategoryLabel = function() {
  const categoryLabels = {
    'CONSULTATION': 'Consultation',
    'PREVENTION': 'Prévention',
    'RESTORATION': 'Restauration',
    'ENDODONTICS': 'Endodontie',
    'PERIODONTICS': 'Parodontologie',
    'ORAL_SURGERY': 'Chirurgie orale',
    'ORTHODONTICS': 'Orthodontie',
    'PROSTHETICS': 'Prothèse',
    'AESTHETIC': 'Esthétique',
    'PEDIATRIC': 'Pédiatrie',
    'EMERGENCY': 'Urgence'
  };
  return categoryLabels[this.category] || this.category;
};

module.exports = Procedure;