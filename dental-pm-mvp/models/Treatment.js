const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Treatment = sequelize.define('treatments', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  appointment_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'appointments',
      key: 'id'
    }
  },
  procedure_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'procedures',
      key: 'id'
    }
  },
  performed_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  treatment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  tooth_numbers: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Numéros des dents concernées, séparées par des virgules'
  },
  quadrant: {
    type: DataTypes.ENUM('UPPER_RIGHT', 'UPPER_LEFT', 'LOWER_LEFT', 'LOWER_RIGHT', 'FULL_MOUTH'),
    allowNull: true,
    comment: 'Quadrant concerné'
  },
  status: {
    type: DataTypes.ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'PLANNED'
  },
  diagnosis: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Diagnostic'
  },
  treatment_plan: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Plan de traitement'
  },
  treatment_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes de traitement'
  },
  anesthesia_used: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  anesthesia_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Type d\'anesthésie utilisée'
  },
  materials_used: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Matériaux utilisés'
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 5,
      max: 480
    }
  },
  cost_mga: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Coût du traitement en MGA'
  },
  follow_up_required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  follow_up_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  follow_up_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  complications: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Complications rencontrées'
  },
  patient_satisfaction: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Satisfaction patient (1-5)'
  }
}, {
  indexes: [
    { fields: ['patient_id'] },
    { fields: ['appointment_id'] },
    { fields: ['procedure_id'] },
    { fields: ['performed_by_user_id'] },
    { fields: ['treatment_date'] },
    { fields: ['status'] },
    { fields: ['follow_up_date'] }
  ]
});

// Instance methods
Treatment.prototype.getStatusLabel = function() {
  const statusLabels = {
    'PLANNED': 'Planifié',
    'IN_PROGRESS': 'En cours',
    'COMPLETED': 'Terminé',
    'CANCELLED': 'Annulé'
  };
  return statusLabels[this.status] || this.status;
};

Treatment.prototype.getQuadrantLabel = function() {
  const quadrantLabels = {
    'UPPER_RIGHT': 'Supérieur droit',
    'UPPER_LEFT': 'Supérieur gauche',
    'LOWER_LEFT': 'Inférieur gauche',
    'LOWER_RIGHT': 'Inférieur droit',
    'FULL_MOUTH': 'Bouche complète'
  };
  return quadrantLabels[this.quadrant] || this.quadrant;
};

Treatment.prototype.getToothNumbersArray = function() {
  if (!this.tooth_numbers) return [];
  return this.tooth_numbers.split(',').map(num => num.trim()).filter(num => num);
};

module.exports = Treatment;