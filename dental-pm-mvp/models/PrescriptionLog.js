const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const PrescriptionLog = sequelize.define('PrescriptionLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  prescription_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  action: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'ISSUE', 'PRINT', 'CANCEL'),
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  meta_json: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('meta_json');
      return val ? JSON.parse(val) : {};
    },
    set(val) {
      this.setDataValue('meta_json', JSON.stringify(val));
    }
  }
}, {
  tableName: 'prescription_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false
});

module.exports = PrescriptionLog;
