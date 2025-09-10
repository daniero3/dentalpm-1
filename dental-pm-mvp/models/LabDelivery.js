const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const LabDelivery = sequelize.define('lab_deliveries', {
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
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  delivery_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Numéro de bon de livraison'
  },
  received_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  quality_check: {
    type: DataTypes.ENUM('PASSED', 'FAILED', 'NEEDS_ADJUSTMENT'),
    allowNull: true,
    comment: 'Résultat du contrôle qualité'
  },
  quality_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes sur la qualité de la livraison'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes générales sur la livraison'
  }
}, {
  indexes: [
    { fields: ['lab_order_id'] },
    { fields: ['delivered_at'] },
    { fields: ['received_by_user_id'] }
  ]
});

// Instance methods
LabDelivery.prototype.getQualityCheckLabel = function() {
  const qualityLabels = {
    'PASSED': 'Conforme',
    'FAILED': 'Non conforme',
    'NEEDS_ADJUSTMENT': 'Ajustements nécessaires'
  };
  return qualityLabels[this.quality_check] || 'Non vérifié';
};

module.exports = LabDelivery;