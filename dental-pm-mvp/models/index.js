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

// Define associations
function defineAssociations() {
  // User associations
  User.hasMany(Patient, { foreignKey: 'created_by_user_id', as: 'createdPatients' });
  User.hasMany(Appointment, { foreignKey: 'dentist_id', as: 'appointments' });
  User.hasMany(Treatment, { foreignKey: 'performed_by_user_id', as: 'treatments' });
  User.hasMany(Invoice, { foreignKey: 'created_by_user_id', as: 'createdInvoices' });

  // Patient associations
  Patient.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
  Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
  Patient.hasMany(Treatment, { foreignKey: 'patient_id', as: 'treatments' });
  Patient.hasMany(Invoice, { foreignKey: 'patient_id', as: 'invoices' });

  // Appointment associations
  Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  Appointment.belongsTo(User, { foreignKey: 'dentist_id', as: 'dentist' });
  Appointment.hasMany(Treatment, { foreignKey: 'appointment_id', as: 'treatments' });

  // Treatment associations
  Treatment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  Treatment.belongsTo(User, { foreignKey: 'performed_by_user_id', as: 'performedBy' });
  Treatment.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
  Treatment.belongsTo(Procedure, { foreignKey: 'procedure_id', as: 'procedure' });

  // Invoice associations
  Invoice.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  Invoice.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
  Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
  Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });

  // Invoice Item associations
  InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
  InvoiceItem.belongsTo(Procedure, { foreignKey: 'procedure_id', as: 'procedure' });

  // Payment associations
  Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

  // SMS Log associations
  SmsLog.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  SmsLog.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

  // Audit Log associations
  AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
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
  AuditLog
};