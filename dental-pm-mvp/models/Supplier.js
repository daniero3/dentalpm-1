const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Supplier = sequelize.define('suppliers', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100],
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'GENERAL',
    comment: 'Type: DENTAL, PHARMA, EQUIPMENT, GENERAL'
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
    type: DataTypes.STRING(30),
    allowNull: true
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
    allowNull: true
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
    type: DataTypes.STRING(30),
    allowNull: true
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
  tableName: 'suppliers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['clinic_id'] },
    { fields: ['name'] },
    { fields: ['type'] },
    { fields: ['is_active'] },
    { fields: ['city'] }
  ]
});

// Instance methods
Supplier.prototype.getPerformanceScore = function() {
  const ratingScore = (this.rating || 3) * 20;
  const leadTimeScore = this.lead_time_days ? Math.max(0, 100 - this.lead_time_days * 2) : 50;
  return Math.round((ratingScore + leadTimeScore) / 2);
};

// Seed default suppliers for a clinic
Supplier.seedForClinic = async function(clinic_id) {
  const count = await Supplier.count({ where: { clinic_id } });
  if (count > 0) return [];

  const defaultSuppliers = [
    { name: 'ADERIS PHARM', type: 'PHARMA', city: 'Antananarivo', phone: '+261 20 22 123 45', email: 'contact@aderispharm.mg' },
    { name: 'HARATO MEDICARE', type: 'PHARMA', city: 'Antananarivo', phone: '+261 20 22 234 56', email: 'info@haratomedicare.mg' },
    { name: 'MAEXI TRADING', type: 'EQUIPMENT', city: 'Antananarivo', phone: '+261 20 22 345 67', email: 'sales@maexitrading.mg' },
    { name: 'E-MEDICAL & DENTAL', type: 'DENTAL', city: 'Antananarivo', phone: '+261 20 22 456 78', email: 'order@emedical.mg' },
    { name: 'DENTAL PRO MADAGASCAR', type: 'DENTAL', city: 'Antananarivo', phone: '+261 20 22 567 89', email: 'contact@dentalpro.mg' }
  ];

  const created = await Supplier.bulkCreate(
    defaultSuppliers.map(s => ({ ...s, clinic_id, is_active: true }))
  );
  console.log(`✅ Seeded ${created.length} default suppliers for clinic ${clinic_id}`);
  return created;
};

module.exports = Supplier;