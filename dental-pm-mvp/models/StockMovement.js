const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const StockMovement = sequelize.define('stock_movements', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('IN', 'OUT', 'ADJUST'),
    allowNull: false,
    comment: 'IN: Stock entrant, OUT: Stock sortant, ADJUST: Ajustement'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notZero(value) {
        if (value === 0) {
          throw new Error('Quantity cannot be zero');
        }
      }
    }
  },
  unit_cost_mga: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Cost price at time of movement in MGA'
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [1, 255],
      notEmpty: true
    },
    comment: 'Reason for movement'
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Reference number (invoice, delivery note, etc.)'
  },
  batch_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Batch or lot number'
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Expiry date for this batch'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,  // ✅ nullable - set par JWT
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who made the movement'
  },
  previous_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Quantity before this movement'
  },
  new_qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Quantity after this movement'
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for backward compatibility
    references: {
      model: 'clinics',
      key: 'id'
    },
    comment: 'Clinic this stock movement belongs to (for multi-tenancy)'
  }
}, {
  indexes: [
    { fields: ['product_id'] },
    { fields: ['type'] },
    { fields: ['user_id'] },
    { fields: ['created_at'] },
    { fields: ['reference'] },
    { fields: ['clinic_id'] }
  ]
});

// Instance methods
StockMovement.prototype.getTypeLabel = function() {
  const typeLabels = {
    'IN': 'Entrée',
    'OUT': 'Sortie',
    'ADJUST': 'Ajustement'
  };
  return typeLabels[this.type] || this.type;
};

StockMovement.prototype.getTotalValue = function() {
  if (!this.unit_cost_mga) return 0;
  return Math.abs(this.quantity) * this.unit_cost_mga;
};

// Hooks to update product quantity
StockMovement.afterCreate(async (movement) => {
  const Product = require('./Product');
  const product = await Product.findByPk(movement.product_id);
  if (product) {
    await product.update({ current_qty: movement.new_qty });
  }
});

module.exports = StockMovement;
