'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add unique index on (clinic_id, reference) where reference is not null
    await queryInterface.addIndex('payment_requests', ['clinic_id', 'reference'], {
      name: 'unique_clinic_reference',
      unique: true,
      where: {
        reference: { [Sequelize.Op.ne]: null }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('payment_requests', 'unique_clinic_reference');
  }
};
