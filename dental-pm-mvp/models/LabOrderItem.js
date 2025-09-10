const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const LabOrderItem = sequelize.define('lab_order_items', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  lab_order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'lab_orders',
      key: 'id'
    }
  },
  tooth_number: {
    type: DataTypes.STRING(5),
    allowNull: true,
    comment: 'Numéro de dent concernée (ex: 11, 21, etc.)'
  },
  work_description: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [1, 255],
      notEmpty: true
    },
    comment: 'Description du travail à effectuer'
  },
  unit_price_mga: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Prix unitaire en MGA'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  subtotal_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Sous-total (quantité × prix unitaire) en MGA'
  },
  material: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Matériau utilisé (métal, ceramic, etc.)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes spécifiques à cet élément'
  }
}, {
  indexes: [
    { fields: ['lab_order_id'] },
    { fields: ['tooth_number'] }
  ]
});

// Hooks to calculate subtotal
LabOrderItem.beforeSave(async (item) => {
  item.subtotal_mga = item.quantity * item.unit_price_mga;
});

module.exports = LabOrderItem;