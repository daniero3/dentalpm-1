'use strict';

module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable('patients').catch(() => null);
    if (!table || !table.patient_number) return;

    await queryInterface.sequelize.query(`
      UPDATE patients
      SET patient_number = 'PAT-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
      WHERE patient_number IS NULL OR patient_number = ''
    `);
  },

  async down() {}
};
