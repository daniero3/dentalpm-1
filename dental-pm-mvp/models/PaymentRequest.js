const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const PaymentRequest = sequelize.define('payment_requests', {
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
  plan_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['ESSENTIAL', 'PRO', 'GROUP']]
    }
  },
  amount_mga: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  payment_method: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'BANK_TRANSFER', 'CASH']]
    }
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  receipt_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'PENDING',
    validate: {
      isIn: [['PENDING', 'VERIFIED', 'REJECTED']]
    }
  },
  submitted_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  verified_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  note_admin: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'payment_requests',
  underscored: true,
  indexes: [
    { fields: ['clinic_id', 'status'] },
    { fields: ['clinic_id', 'created_at'] },
    { fields: ['status'] }
  ]
});

module.exports = PaymentRequest;
