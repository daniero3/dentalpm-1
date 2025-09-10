const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Supplier = sequelize.define('suppliers', {
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
  nif_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Numéro d\'Identification Fiscale (Madagascar)'
  },
  stat_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Numéro STAT (Madagascar)'
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
  contact_person: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Nom de la personne de contact'
  },
  contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/
    }
  },
  payment_terms: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Net 30 jours',
    comment: 'Conditions de paiement'
  },
  lead_time_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Délai de livraison moyen en jours'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Note du fournisseur (1-5 étoiles)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  indexes: [
    { fields: ['name'] },
    { fields: ['nif_number'] },
    { fields: ['is_active'] },
    { fields: ['city'] }
  ]
});

// Instance methods
Supplier.prototype.getPerformanceScore = function() {
  // Simple scoring based on rating and lead time
  const ratingScore = (this.rating || 3) * 20; // Convert 1-5 to percentage
  const leadTimeScore = this.lead_time_days ? Math.max(0, 100 - this.lead_time_days * 2) : 50;
  return Math.round((ratingScore + leadTimeScore) / 2);
};

module.exports = Supplier;