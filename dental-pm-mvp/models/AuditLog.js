const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const AuditLog = sequelize.define('audit_logs', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Null pour les actions système'
  },
  action: {
    type: DataTypes.ENUM(
      'CREATE',
      'UPDATE', 
      'DELETE',
      'LOGIN',
      'LOGOUT',
      'VIEW',
      'EXPORT',
      'PRINT',
      'SEND_SMS',
      'PAYMENT_PROCESS'
    ),
    allowNull: false
  },
  resource_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Type de ressource (patients, invoices, appointments, etc.)'
  },
  resource_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID de la ressource concernée'
  },
  old_values: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Anciennes valeurs (pour UPDATE/DELETE)'
  },
  new_values: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Nouvelles valeurs (pour CREATE/UPDATE)'
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description détaillée de l\'action'
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for system-wide actions
    references: {
      model: 'clinics',
      key: 'id'
    },
    comment: 'Clinic this audit log belongs to (null for system-wide actions)'
  }
}, {
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action'] },
    { fields: ['resource_type'] },
    { fields: ['resource_id'] },
    { fields: ['created_at'] },
    { fields: ['ip_address'] },
    { fields: ['clinic_id'] }
  ]
});

// Instance methods
AuditLog.prototype.getActionLabel = function() {
  const actionLabels = {
    'CREATE': 'Création',
    'UPDATE': 'Modification',
    'DELETE': 'Suppression',
    'LOGIN': 'Connexion',
    'LOGOUT': 'Déconnexion',
    'VIEW': 'Consultation',
    'EXPORT': 'Export',
    'PRINT': 'Impression',
    'SEND_SMS': 'Envoi SMS',
    'PAYMENT_PROCESS': 'Traitement paiement'
  };
  return actionLabels[this.action] || this.action;
};

module.exports = AuditLog;