'use strict';

/**
 * Migration: Enforce clinic_id NOT NULL and add indexes
 * For multi-tenancy data integrity
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Add indexes on clinic_id (if not exists)
      const tables = ['patients', 'appointments', 'invoices'];
      
      for (const table of tables) {
        try {
          await queryInterface.addIndex(table, ['clinic_id'], {
            name: `${table}_clinic_id_idx`,
            transaction
          });
          console.log(`Index created on ${table}.clinic_id`);
        } catch (e) {
          if (e.message.includes('already exists')) {
            console.log(`Index already exists on ${table}.clinic_id`);
          } else {
            throw e;
          }
        }
      }

      // 2. Change clinic_id to NOT NULL
      // SQLite doesn't support ALTER COLUMN, so we need to check DB type
      const dialect = queryInterface.sequelize.getDialect();
      
      if (dialect === 'sqlite') {
        // For SQLite, we need to recreate tables or use pragma
        // The model constraint will enforce NOT NULL on new inserts
        console.log('SQLite: NOT NULL constraint enforced via model validation');
      } else {
        // For PostgreSQL/MySQL
        for (const table of tables) {
          await queryInterface.changeColumn(table, 'clinic_id', {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'clinics',
              key: 'id'
            }
          }, { transaction });
          console.log(`${table}.clinic_id set to NOT NULL`);
        }
      }

      await transaction.commit();
      console.log('Migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const tables = ['patients', 'appointments', 'invoices'];
      
      // Remove indexes
      for (const table of tables) {
        try {
          await queryInterface.removeIndex(table, `${table}_clinic_id_idx`, { transaction });
        } catch (e) {
          console.log(`Index removal skipped for ${table}: ${e.message}`);
        }
      }

      // Revert to allowNull: true (only for non-SQLite)
      const dialect = queryInterface.sequelize.getDialect();
      if (dialect !== 'sqlite') {
        for (const table of tables) {
          await queryInterface.changeColumn(table, 'clinic_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'clinics',
              key: 'id'
            }
          }, { transaction });
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
