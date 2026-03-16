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
    allowNull: true  // ✅ null pour SUPER_ADMIN
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  prescriber_id: {
    type: DataTypes.UUID,
    allowNull: true  // ✅ null si pas de prescripteur
  },
  number: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),  // ✅ STRING au lieu de ENUM
    defaultValue: 'DRAFT'
  },
  content_json: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('content_json');
      if (!val) return { items: [], notes: '' };
      try { return JSON.parse(val); }
      catch { return { items: [], notes: '' }; }
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
  underscored: true
});

module.exports = Prescription;
