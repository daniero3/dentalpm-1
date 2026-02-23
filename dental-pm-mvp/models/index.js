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

// New SaaS models
const Clinic = require('./Clinic');
const Subscription = require('./Subscription');
const SubscriptionInvoice = require('./SubscriptionInvoice');
const PaymentRequest = require('./PaymentRequest');

// Pricing models
const PricingSchedule = require('./PricingSchedule');
const ProcedureFee = require('./ProcedureFee');

// Document model
const Document = require('./Document');

// Prescription models
const Prescription = require('./Prescription');
const PrescriptionLog = require('./PrescriptionLog');

// Odontogram models
const ToothStatus = require('./ToothStatus');
const ToothHistory = require('./ToothHistory');

// Messaging models
const MessageTemplate = require('./MessageTemplate');
const MessageQueue = require('./MessageQueue');
const MessageLog = require('./MessageLog');

// Purchase Order models
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');

// Define associations
function defineAssociations() {
  // Clinic relationships
  Clinic.hasMany(User, { foreignKey: 'clinic_id', as: 'users' });
  Clinic.hasMany(Patient, { foreignKey: 'clinic_id', as: 'patients' });
  Clinic.hasMany(Subscription, { foreignKey: 'clinic_id', as: 'subscriptions' });
  Clinic.hasMany(SubscriptionInvoice, { foreignKey: 'clinic_id', as: 'invoices' });

  // Existing associations (updated with clinic relationships)
  User.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  User.hasMany(Patient, { foreignKey: 'created_by_user_id', as: 'createdPatients' });
  User.hasMany(Appointment, { foreignKey: 'dentist_id', as: 'appointments' });
  User.hasMany(Treatment, { foreignKey: 'performed_by_user_id', as: 'treatments' });
  User.hasMany(Invoice, { foreignKey: 'created_by_user_id', as: 'createdInvoices' });

  Patient.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
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

  // Subscription relationships
  Subscription.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  Subscription.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
  Subscription.hasMany(SubscriptionInvoice, { foreignKey: 'subscription_id', as: 'invoices' });

  // Subscription Invoice relationships
  SubscriptionInvoice.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  SubscriptionInvoice.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });
  SubscriptionInvoice.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });

  // PaymentRequest relationships
  PaymentRequest.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  PaymentRequest.belongsTo(User, { foreignKey: 'submitted_by_user_id', as: 'submittedBy' });
  PaymentRequest.belongsTo(User, { foreignKey: 'verified_by_user_id', as: 'verifiedBy' });
  Clinic.hasMany(PaymentRequest, { foreignKey: 'clinic_id', as: 'paymentRequests' });

  // Pricing Schedule relationships
  PricingSchedule.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  PricingSchedule.hasMany(ProcedureFee, { foreignKey: 'schedule_id', as: 'fees' });
  Clinic.hasMany(PricingSchedule, { foreignKey: 'clinic_id', as: 'pricingSchedules' });

  ProcedureFee.belongsTo(PricingSchedule, { foreignKey: 'schedule_id', as: 'schedule' });

  // Invoice to PricingSchedule
  Invoice.belongsTo(PricingSchedule, { foreignKey: 'schedule_id', as: 'pricingSchedule' });
  PricingSchedule.hasMany(Invoice, { foreignKey: 'schedule_id', as: 'invoices' });

  // Document associations
  Document.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  Document.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  Document.belongsTo(User, { foreignKey: 'uploaded_by_user_id', as: 'uploadedBy' });
  Patient.hasMany(Document, { foreignKey: 'patient_id', as: 'documents' });

  // Prescription associations
  Prescription.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  Prescription.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  Prescription.belongsTo(User, { foreignKey: 'prescriber_id', as: 'prescriber' });
  Patient.hasMany(Prescription, { foreignKey: 'patient_id', as: 'prescriptions' });
  PrescriptionLog.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });
  PrescriptionLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // Odontogram associations
  ToothStatus.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  ToothStatus.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedBy' });
  Patient.hasMany(ToothStatus, { foreignKey: 'patient_id', as: 'toothStatuses' });
  ToothHistory.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  ToothHistory.belongsTo(User, { foreignKey: 'performed_by', as: 'performedBy' });

  // Messaging associations
  MessageTemplate.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  Clinic.hasMany(MessageTemplate, { foreignKey: 'clinic_id', as: 'messageTemplates' });

  MessageQueue.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  MessageQueue.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  Clinic.hasMany(MessageQueue, { foreignKey: 'clinic_id', as: 'messageQueue' });
  Patient.hasMany(MessageQueue, { foreignKey: 'patient_id', as: 'messageQueue' });

  MessageLog.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  MessageLog.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
  Clinic.hasMany(MessageLog, { foreignKey: 'clinic_id', as: 'messageLogs' });
  Patient.hasMany(MessageLog, { foreignKey: 'patient_id', as: 'messageLogs' });

  // Purchase Order associations
  PurchaseOrder.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });
  PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
  PurchaseOrder.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });
  PurchaseOrder.belongsTo(User, { foreignKey: 'received_by', as: 'receivedBy' });
  PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchase_order_id', as: 'items' });
  
  PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id', as: 'purchaseOrder' });
  PurchaseOrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  
  Clinic.hasMany(PurchaseOrder, { foreignKey: 'clinic_id', as: 'purchaseOrders' });
  Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplier_id', as: 'purchaseOrders' });
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
  MailingLog,
  // New SaaS models
  Clinic,
  Subscription,
  SubscriptionInvoice,
  PaymentRequest,
  // Pricing models
  PricingSchedule,
  ProcedureFee,
  // Document model
  Document,
  // Prescription models
  Prescription,
  PrescriptionLog,
  // Odontogram models
  ToothStatus,
  ToothHistory,
  // Messaging models
  MessageTemplate,
  MessageQueue,
  MessageLog
};