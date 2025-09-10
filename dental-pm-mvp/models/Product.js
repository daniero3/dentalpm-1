const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Product = sequelize.define('products', {
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
  sku: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [1, 50],
      notEmpty: true
    }
  },
  category: {
    type: DataTypes.ENUM(
      'INSTRUMENTS',
      'CONSUMABLES',
      'MATERIALS',
      'EQUIPMENT',
      'PROSTHETICS',
      'ORTHODONTICS',
      'HYGIENE',
      'ANESTHESIA',
      'RADIOLOGY',
      'OTHER'
    ),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'PIECE',
    comment: 'Unit of measurement: PIECE, BOX, ML, KG, etc.'
  },
  unit_cost_mga: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Cost price in Ariary malgache'
  },
  sale_price_mga: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Sale price in Ariary malgache'
  },
  supplier_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'suppliers',
      key: 'id'
    }
  },
  min_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    validate: {
      min: 0
    },
    comment: 'Minimum quantity threshold for low stock alert'
  },
  current_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Current quantity in stock'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  barcode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Expiry date for consumables'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for backward compatibility
    references: {
      model: 'clinics',
      key: 'id'
    },
    comment: 'Clinic this product belongs to (for multi-tenancy)'
  }
}, {
  indexes: [
    { fields: ['sku'] },
    { fields: ['category'] },
    { fields: ['supplier_id'] },
    { fields: ['is_active'] },
    { fields: ['current_qty'] },
    { fields: ['min_qty'] }
  ]
});

// Instance methods
Product.prototype.getCategoryLabel = function() {
  const categoryLabels = {
    'INSTRUMENTS': 'Instruments',
    'CONSUMABLES': 'Consommables',
    'MATERIALS': 'Matériaux',
    'EQUIPMENT': 'Équipements',
    'PROSTHETICS': 'Prothèses',
    'ORTHODONTICS': 'Orthodontie',
    'HYGIENE': 'Hygiène',
    'ANESTHESIA': 'Anesthésie',
    'RADIOLOGY': 'Radiologie',
    'OTHER': 'Autre'
  };
  return categoryLabels[this.category] || this.category;
};

Product.prototype.isLowStock = function() {
  return this.current_qty <= this.min_qty;
};

Product.prototype.getMarginPercentage = function() {
  if (this.unit_cost_mga === 0) return 0;
  return ((this.sale_price_mga - this.unit_cost_mga) / this.unit_cost_mga) * 100;
};

Product.prototype.getStockValue = function() {
  return this.current_qty * this.unit_cost_mga;
};

module.exports = Product;