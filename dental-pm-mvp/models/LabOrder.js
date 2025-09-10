const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const LabOrder = sequelize.define('lab_orders', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  order_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Auto-generated: LAB-000001'
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  dentist_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  lab_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'labs',
      key: 'id'
    }
  },
  work_type: {
    type: DataTypes.ENUM(
      'CROWN',
      'BRIDGE',
      'PARTIAL_DENTURE',
      'COMPLETE_DENTURE',
      'IMPLANT_CROWN',
      'ORTHODONTIC_APPLIANCE',
      'NIGHT_GUARD',
      'VENEER',
      'INLAY_ONLAY',
      'OTHER'
    ),
    allowNull: false
  },
  shade: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Teinte dentaire (A1, B2, etc.)'
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date de livraison souhaitée'
  },
  status: {
    type: DataTypes.ENUM('CREATED', 'SENT', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'CREATED'
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT'),
    allowNull: false,
    defaultValue: 'NORMAL'
  },
  total_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Total en Ariary malgache'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Instructions spéciales pour le laboratoire'
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['order_number'] },
    { fields: ['patient_id'] },
    { fields: ['dentist_id'] },
    { fields: ['lab_id'] },
    { fields: ['status'] },
    { fields: ['due_date'] },
    { fields: ['work_type'] }
  ]
});

// Instance methods
LabOrder.prototype.getWorkTypeLabel = function() {
  const workTypeLabels = {
    'CROWN': 'Couronne',
    'BRIDGE': 'Bridge',
    'PARTIAL_DENTURE': 'Prothèse partielle',
    'COMPLETE_DENTURE': 'Prothèse complète',
    'IMPLANT_CROWN': 'Couronne sur implant',
    'ORTHODONTIC_APPLIANCE': 'Appareil orthodontique',
    'NIGHT_GUARD': 'Gouttière de nuit',
    'VENEER': 'Facette',
    'INLAY_ONLAY': 'Inlay/Onlay',
    'OTHER': 'Autre'
  };
  return workTypeLabels[this.work_type] || this.work_type;
};

LabOrder.prototype.getStatusLabel = function() {
  const statusLabels = {
    'CREATED': 'Créé',
    'SENT': 'Envoyé',
    'IN_PROGRESS': 'En cours',
    'DELIVERED': 'Livré',
    'CANCELLED': 'Annulé'
  };
  return statusLabels[this.status] || this.status;
};

LabOrder.prototype.getPriorityLabel = function() {
  const priorityLabels = {
    'LOW': 'Basse',
    'NORMAL': 'Normale',
    'HIGH': 'Haute',
    'URGENT': 'Urgente'
  };
  return priorityLabels[this.priority] || this.priority;
};

LabOrder.prototype.isOverdue = function() {
  if (this.status === 'DELIVERED' || this.status === 'CANCELLED') return false;
  return new Date() > new Date(this.due_date);
};

// Hooks for auto-generating order number
LabOrder.beforeCreate(async (order) => {
  if (!order.order_number) {
    try {
      const count = await LabOrder.count();
      order.order_number = `LAB-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      order.order_number = `LAB-${Date.now().toString().slice(-6)}`;
    }
  }
});

module.exports = LabOrder;