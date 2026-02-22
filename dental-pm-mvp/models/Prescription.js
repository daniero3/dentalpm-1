const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Prescription = sequelize.define('Prescription', {
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
  prescriber_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  number: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'ISSUED', 'CANCELLED'),
    defaultValue: 'DRAFT'
  },
  content_json: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('content_json');
      return val ? JSON.parse(val) : { items: [], notes: '' };
    },
    set(val) {
      this.setDataValue('content_json', JSON.stringify(val));
    }
  },
  issued_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'prescriptions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['clinic_id', 'patient_id'] },
    { fields: ['clinic_id', 'number'], unique: true }
  ]
});

module.exports = Prescription;
