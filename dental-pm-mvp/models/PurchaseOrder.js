const { DataTypes, Op } = require('sequelize');
const sequelize = require('../database/connection');

const PurchaseOrder = sequelize.define('purchase_orders', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true,  // ← SUPER_ADMIN peut créer sans clinic
    references: { model: 'clinics', key: 'id' }
  },
  supplier_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'suppliers', key: 'id' }
  },
  number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.STRING(20),  // STRING au lieu d'ENUM pour éviter les bugs PostgreSQL
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  total_mga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  received_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  received_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  }
}, {
  tableName: 'purchase_orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['clinic_id'] },
    { fields: ['supplier_id'] },
    { fields: ['number'], unique: true },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

// Générer le prochain numéro PO — fonctionne avec ou sans clinic_id
PurchaseOrder.generateNumber = async function(clinic_id) {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  // Si clinic_id est null (SUPER_ADMIN), chercher parmi tous les bons
  const whereClause = { number: { [Op.like]: `${prefix}%` } };
  if (clinic_id) whereClause.clinic_id = clinic_id;

  const lastPO = await PurchaseOrder.findOne({
    where: whereClause,
    order: [['number', 'DESC']]
  });

  let nextNum = 1;
  if (lastPO) {
    const lastNum = parseInt(lastPO.number.replace(prefix, ''), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

module.exports = PurchaseOrder;
