'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const safe = async (fn) => { try { await fn(); } catch(e) { if (!e.message.includes('already exists')) throw e; } };

    // Patients — recherche fréquente par nom
    await safe(() => queryInterface.addIndex('patients', ['clinic_id', 'last_name'], { name: 'idx_patients_clinic_name' }));
    await safe(() => queryInterface.addIndex('patients', ['clinic_id', 'created_at'], { name: 'idx_patients_clinic_date' }));

    // Appointments — filtre par date et statut
    await safe(() => queryInterface.addIndex('appointments', ['clinic_id', 'appointment_date'], { name: 'idx_appt_clinic_date' }));
    await safe(() => queryInterface.addIndex('appointments', ['clinic_id', 'status'], { name: 'idx_appt_clinic_status' }));

    // Invoices — filtre par statut et type
    await safe(() => queryInterface.addIndex('invoices', ['clinic_id', 'document_type', 'status'], { name: 'idx_inv_clinic_type_status' }));
    await safe(() => queryInterface.addIndex('invoices', ['clinic_id', 'invoice_date'], { name: 'idx_inv_clinic_date' }));

    // Subscriptions — lookup par clinic
    await safe(() => queryInterface.addIndex('subscriptions', ['clinic_id', 'status'], { name: 'idx_sub_clinic_status' }));
    await safe(() => queryInterface.addIndex('subscriptions', ['status', 'end_date'], { name: 'idx_sub_status_end' }));

    // Lab orders
    await safe(() => queryInterface.addIndex('lab_orders', ['clinic_id', 'status'], { name: 'idx_lab_clinic_status' }));

    // Products/inventory
    await safe(() => queryInterface.addIndex('products', ['clinic_id', 'category'], { name: 'idx_prod_clinic_cat' }));

    console.log('✅ Index de performance créés');
  },
  async down(queryInterface) {
    const names = ['idx_patients_clinic_name','idx_patients_clinic_date','idx_appt_clinic_date',
      'idx_appt_clinic_status','idx_inv_clinic_type_status','idx_inv_clinic_date',
      'idx_sub_clinic_status','idx_sub_status_end','idx_lab_clinic_status','idx_prod_clinic_cat'];
    for (const name of names) {
      await queryInterface.removeIndex('patients', name).catch(()=>{});
    }
  }
};
