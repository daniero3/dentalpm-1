const sequelize = require('../database/connection');

// Import all models
const User = require('./User');
const Patient = require('./Patient');
const Appointment = require('./Appointment');
const Treatment = require('./Treatment');
const Procedure = require('./Procedure');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const Payment = require('./Payment');
const SmsLog = require('./SmsLog');
const AuditLog = require('./AuditLog');

// New models for extended functionality
const Product = require('./Product');
const Supplier = require('./Supplier');
const StockMovement = require('./StockMovement');
const Lab = require('./Lab');
const LabOrder = require('./LabOrder');
const LabOrderItem = require('./LabOrderItem');
const LabDelivery = require('./LabDelivery');
const MailingCampaign = require('./MailingCampaign');
const MailingLog = require('./MailingLog');

// Define associations
function defineAssociations() {
  // Existing associations
  User.hasMany(Patient, { foreignKey: 'created_by_user_id', as: 'createdPatients' });
  User.hasMany(Appointment, { foreignKey: 'dentist_id', as: 'appointments' });
  User.hasMany(Treatment, { foreignKey: 'performed_by_user_id', as: 'treatments' });
  User.hasMany(Invoice, { foreignKey: 'created_by_user_id', as: 'createdInvoices' });

  Patient.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
  Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
  Patient.hasMany(Treatment, { foreignKey: 'patient_id', as: 'treatments' });
  Patient.hasMany(Invoice, { foreignKey: 'patient_id', as: 'invoices' });

  Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  Appointment.belongsTo(User, { foreignKey: 'dentist_id', as: 'dentist' });
  Appointment.hasMany(Treatment, { foreignKey: 'appointment_id', as: 'treatments' });

  Treatment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  Treatment.belongsTo(User, { foreignKey: 'performed_by_user_id', as: 'performedBy' });
  Treatment.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
  Treatment.belongsTo(Procedure, { foreignKey: 'procedure_id', as: 'procedure' });

  Invoice.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  Invoice.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
  Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
  Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });

  InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
  InvoiceItem.belongsTo(Procedure, { foreignKey: 'procedure_id', as: 'procedure' });

  Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

  SmsLog.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  SmsLog.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

  AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // New associations for extended functionality

  // Inventory & Supplier associations
  Supplier.hasMany(Product, { foreignKey: 'supplier_id', as: 'products' });
  Product.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
  Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'movements' });
  StockMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  StockMovement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(StockMovement, { foreignKey: 'user_id', as: 'stockMovements' });

  // Lab Management associations
  Lab.hasMany(LabOrder, { foreignKey: 'lab_id', as: 'orders' });
  LabOrder.belongsTo(Lab, { foreignKey: 'lab_id', as: 'lab' });
  LabOrder.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  LabOrder.belongsTo(User, { foreignKey: 'dentist_id', as: 'dentist' });
  LabOrder.hasMany(LabOrderItem, { foreignKey: 'lab_order_id', as: 'items' });
  LabOrder.hasOne(LabDelivery, { foreignKey: 'lab_order_id', as: 'delivery' });

  LabOrderItem.belongsTo(LabOrder, { foreignKey: 'lab_order_id', as: 'labOrder' });

  LabDelivery.belongsTo(LabOrder, { foreignKey: 'lab_order_id', as: 'labOrder' });
  LabDelivery.belongsTo(User, { foreignKey: 'received_by_user_id', as: 'receivedBy' });

  Patient.hasMany(LabOrder, { foreignKey: 'patient_id', as: 'labOrders' });
  User.hasMany(LabOrder, { foreignKey: 'dentist_id', as: 'labOrders' });
  User.hasMany(LabDelivery, { foreignKey: 'received_by_user_id', as: 'receivedDeliveries' });

  // Mailing associations
  MailingCampaign.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
  MailingCampaign.hasMany(MailingLog, { foreignKey: 'campaign_id', as: 'logs' });

  MailingLog.belongsTo(MailingCampaign, { foreignKey: 'campaign_id', as: 'campaign' });
  MailingLog.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

  User.hasMany(MailingCampaign, { foreignKey: 'created_by_user_id', as: 'mailingCampaigns' });
  Patient.hasMany(MailingLog, { foreignKey: 'patient_id', as: 'mailingLogs' });
}

// Initialize associations
defineAssociations();

// Export all models and sequelize instance
module.exports = {
  sequelize,
  User,
  Patient,
  Appointment,
  Treatment,
  Procedure,
  Invoice,
  InvoiceItem,
  Payment,
  SmsLog,
  AuditLog,
  // New models
  Product,
  Supplier,
  StockMovement,
  Lab,
  LabOrder,
  LabOrderItem,
  LabDelivery,
  MailingCampaign,
  MailingLog
};