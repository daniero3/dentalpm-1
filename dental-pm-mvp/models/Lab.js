const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Lab = sequelize.define('labs', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100],
      notEmpty: true
    }
  },
  contact_person: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Nom de la personne de contact'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      is: /^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/ // Madagascar phone format
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 500],
      notEmpty: true
    }
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Antananarivo'
  },
  specialties: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Spécialités du laboratoire (couronnes, bridges, etc.)'
  },
  lead_time_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 7,
    validate: {
      min: 1
    },
    comment: 'Délai de fabrication moyen en jours'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Note du laboratoire (1-5 étoiles)'
  },
  payment_terms: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Net 30 jours',
    comment: 'Conditions de paiement'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for shared labs, specific value for clinic-exclusive labs
    references: {
      model: 'clinics',
      key: 'id'
    },
    comment: 'Clinic this lab belongs to (null = available to all clinics)'
  }
}, {
  indexes: [
    { fields: ['name'] },
    { fields: ['city'] },
    { fields: ['is_active'] }
  ]
});

// Instance methods
Lab.prototype.getAverageRating = function() {
  return this.rating || 0;
};

Lab.prototype.getSpecialtiesList = function() {
  if (!this.specialties) return [];
  return this.specialties.split(',').map(s => s.trim()).filter(s => s);
};

module.exports = Lab;