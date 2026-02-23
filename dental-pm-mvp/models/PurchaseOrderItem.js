const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const PurchaseOrderItem = sequelize.define('purchase_order_items', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  purchase_order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'purchase_orders',
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  unit_price_mga: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  line_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'purchase_order_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['purchase_order_id'] },
    { fields: ['product_id'] }
  ],
  hooks: {
    beforeSave: (item) => {
      item.line_total = item.qty * item.unit_price_mga;
    }
  }
});

module.exports = PurchaseOrderItem;
