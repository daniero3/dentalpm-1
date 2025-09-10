const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const InvoiceItem = sequelize.define('invoice_items', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  procedure_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'procedures',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [1, 255],
      notEmpty: true
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  unit_price_mga: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Prix unitaire en Ariary malgache'
  },
  total_price_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Prix total (quantité × prix unitaire) en MGA'
  },
  tooth_number: {
    type: DataTypes.STRING(5),
    allowNull: true,
    comment: 'Numéro de dent concernée (ex: 11, 21, etc.)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes spécifiques à cet item'
  }
}, {
  indexes: [
    { fields: ['invoice_id'] },
    { fields: ['procedure_id'] },
    { fields: ['tooth_number'] }
  ]
});

// Hooks to calculate total price
InvoiceItem.beforeSave(async (item) => {
  item.total_price_mga = item.quantity * item.unit_price_mga;
});

module.exports = InvoiceItem;