'use strict';

module.exports = {
  async up(queryInterface) {
    const addIndexIfMissing = async (table, fields, options = {}) => {
      try {
        const indexes = await queryInterface.showIndex(table);
        const exists = indexes.some((index) => (
          options.name
            ? index.name === options.name
            : fields.every((field) => index.fields?.some((entry) => entry.attribute === field))
        ));
        if (!exists) await queryInterface.addIndex(table, fields, options);
      } catch (error) {
        if (!/does not exist|already exists|duplicate/i.test(error.message)) throw error;
      }
    };

    await addIndexIfMissing('patients', ['clinic_id', 'last_name', 'first_name'], { name: 'patients_clinic_name_idx' });
    await addIndexIfMissing('patients', ['clinic_id', 'created_at'], { name: 'patients_clinic_created_idx' });
    await addIndexIfMissing('appointments', ['clinic_id', 'appointment_date', 'start_time'], { name: 'appointments_clinic_date_time_idx' });
    await addIndexIfMissing('appointments', ['clinic_id', 'status'], { name: 'appointments_clinic_status_idx' });
    await addIndexIfMissing('invoices', ['clinic_id', 'document_type', 'created_at'], { name: 'invoices_clinic_doc_created_idx' });
    await addIndexIfMissing('invoices', ['clinic_id', 'status', 'invoice_date'], { name: 'invoices_clinic_status_date_idx' });
    await addIndexIfMissing('payments', ['clinic_id', 'status', 'payment_date'], { name: 'payments_clinic_status_date_idx' });
    await addIndexIfMissing('purchase_orders', ['clinic_id', 'created_at'], { name: 'purchase_orders_clinic_created_idx' });
    await addIndexIfMissing('purchase_orders', ['clinic_id', 'expense_date'], { name: 'purchase_orders_clinic_expense_date_idx' });
    await addIndexIfMissing('purchase_orders', ['clinic_id', 'status'], { name: 'purchase_orders_clinic_status_idx' });
  },

  async down() {
    // Non-destructive in production.
  }
};
