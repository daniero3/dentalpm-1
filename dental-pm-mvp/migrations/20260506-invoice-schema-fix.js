'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const describe = async (table) => {
      try {
        return await queryInterface.describeTable(table);
      } catch (error) {
        return null;
      }
    };

    const addColumnIfMissing = async (table, column, definition) => {
      const schema = await describe(table);
      if (!schema || schema[column]) return;
      await queryInterface.addColumn(table, column, definition);
    };

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
        if (!/already exists|duplicate/i.test(error.message)) throw error;
      }
    };

    if (!(await describe('pricing_schedules'))) {
      await queryInterface.createTable('pricing_schedules', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        clinic_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'clinics', key: 'id' },
          onDelete: 'SET NULL'
        },
        type: {
          type: Sequelize.ENUM('SYNDICAL', 'CABINET'),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        is_default: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        year: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 2026
        },
        version_code: {
          type: Sequelize.STRING(30),
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    } else {
      await addColumnIfMissing('pricing_schedules', 'year', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 2026
      });
      await addColumnIfMissing('pricing_schedules', 'version_code', {
        type: Sequelize.STRING(30),
        allowNull: true
      });
    }

    if (!(await describe('procedure_fees'))) {
      await queryInterface.createTable('procedure_fees', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        schedule_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'pricing_schedules', key: 'id' },
          onDelete: 'CASCADE'
        },
        procedure_code: {
          type: Sequelize.STRING(20),
          allowNull: false
        },
        label: {
          type: Sequelize.STRING(200),
          allowNull: false
        },
        price_mga: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        category: {
          type: Sequelize.STRING(50),
          allowNull: true,
          defaultValue: 'GENERAL'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    await addColumnIfMissing('invoices', 'document_type', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'INVOICE'
    });
    await addColumnIfMissing('invoices', 'clinic_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'clinics', key: 'id' },
      onDelete: 'SET NULL'
    });
    await addColumnIfMissing('invoices', 'schedule_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'pricing_schedules', key: 'id' },
      onDelete: 'SET NULL'
    });
    await addColumnIfMissing('invoices', 'created_by_user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    });

    await addIndexIfMissing('pricing_schedules', ['clinic_id', 'type'], { name: 'unique_clinic_schedule', unique: true });
    await addIndexIfMissing('pricing_schedules', ['clinic_id', 'is_active'], { name: 'pricing_schedules_clinic_active_idx' });
    await addIndexIfMissing('procedure_fees', ['schedule_id', 'procedure_code'], { name: 'procedure_fees_schedule_code_idx', unique: true });
    await addIndexIfMissing('procedure_fees', ['schedule_id', 'category'], { name: 'procedure_fees_schedule_category_idx' });
    await addIndexIfMissing('invoices', ['schedule_id'], { name: 'invoices_schedule_id_idx' });
    await addIndexIfMissing('invoices', ['clinic_id'], { name: 'invoices_clinic_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('invoices', 'invoices_clinic_id_idx').catch(() => {});
    await queryInterface.removeIndex('invoices', 'invoices_schedule_id_idx').catch(() => {});
    await queryInterface.removeIndex('procedure_fees', 'procedure_fees_schedule_category_idx').catch(() => {});
    await queryInterface.removeIndex('procedure_fees', 'procedure_fees_schedule_code_idx').catch(() => {});
    await queryInterface.removeIndex('pricing_schedules', 'pricing_schedules_clinic_active_idx').catch(() => {});
    await queryInterface.removeIndex('pricing_schedules', 'unique_clinic_schedule').catch(() => {});
  }
};
