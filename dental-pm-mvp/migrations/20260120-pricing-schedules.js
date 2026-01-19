'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create pricing_schedules table
    await queryInterface.createTable('pricing_schedules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      clinic_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'clinics',
          key: 'id'
        },
        onDelete: 'CASCADE'
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

    // Create procedure_fees table
    await queryInterface.createTable('procedure_fees', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      schedule_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'pricing_schedules',
          key: 'id'
        },
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

    // Add schedule_id to invoices
    await queryInterface.addColumn('invoices', 'schedule_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'pricing_schedules',
        key: 'id'
      }
    });

    // Add indexes
    await queryInterface.addIndex('pricing_schedules', ['clinic_id', 'type'], { unique: true });
    await queryInterface.addIndex('pricing_schedules', ['clinic_id', 'is_active']);
    await queryInterface.addIndex('procedure_fees', ['schedule_id', 'procedure_code'], { unique: true });
    await queryInterface.addIndex('procedure_fees', ['schedule_id', 'category']);
    await queryInterface.addIndex('invoices', ['schedule_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('invoices', 'schedule_id');
    await queryInterface.dropTable('procedure_fees');
    await queryInterface.dropTable('pricing_schedules');
  }
};
