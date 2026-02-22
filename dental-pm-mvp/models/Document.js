const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  uploaded_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('RADIO', 'PHOTO', 'ANALYSE', 'FAISABILITE', 'ORDONNANCE', 'AUTRE'),
    allowNull: false,
    defaultValue: 'AUTRE'
  },
  original_filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  stored_filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deleted_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'documents',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['clinic_id'] },
    { fields: ['patient_id'] },
    { fields: ['category'] },
    { fields: ['is_deleted'] }
  ]
});

module.exports = Document;
