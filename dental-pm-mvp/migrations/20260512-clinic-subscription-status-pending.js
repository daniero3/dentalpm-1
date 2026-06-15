'use strict';

module.exports = {
  async up(queryInterface) {
    const values = ['PENDING', 'TRIAL_EXPIRED', 'CANCELLED', 'SUSPENDED'];

    for (const value of values) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_clinics_subscription_status" ADD VALUE IF NOT EXISTS '${value}'`
      ).catch((error) => {
        if (!/does not exist|undefined_object/i.test(error.message)) throw error;
      });
    }
  },

  async down() {
    // PostgreSQL enum values cannot be removed safely without rebuilding the type.
  }
};
