'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'enum_audit_logs_action'
        ) THEN
          ALTER TYPE enum_audit_logs_action ADD VALUE IF NOT EXISTS 'IMPORT';
        END IF;
      END
      $$;
    `);
  },

  async down() {
    // PostgreSQL enum values cannot be removed safely in a generic rollback.
  }
};
