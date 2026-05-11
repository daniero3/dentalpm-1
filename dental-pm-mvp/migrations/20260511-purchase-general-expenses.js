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

    const changeColumnIfExists = async (table, column, definition) => {
      const schema = await describe(table);
      if (!schema || !schema[column]) return;
      await queryInterface.changeColumn(table, column, definition);
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

    await addColumnIfMissing('purchase_orders', 'expense_type', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'PURCHASE'
    });
    await addColumnIfMissing('purchase_orders', 'expense_category', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
    await addColumnIfMissing('purchase_orders', 'expense_label', {
      type: Sequelize.STRING(150),
      allowNull: true
    });
    await addColumnIfMissing('purchase_orders', 'expense_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    await changeColumnIfExists('purchase_orders', 'supplier_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'suppliers', key: 'id' },
      onDelete: 'SET NULL'
    });
    await queryInterface.sequelize.query(
      'ALTER TABLE "purchase_orders" ALTER COLUMN "supplier_id" DROP NOT NULL;'
    ).catch((error) => {
      if (!/does not exist|not-null/i.test(error.message)) throw error;
    });

    await addIndexIfMissing('purchase_orders', ['expense_type'], {
      name: 'purchase_orders_expense_type_idx'
    });
    await addIndexIfMissing('purchase_orders', ['expense_category'], {
      name: 'purchase_orders_expense_category_idx'
    });
    await addIndexIfMissing('purchase_orders', ['expense_date'], {
      name: 'purchase_orders_expense_date_idx'
    });
  },

  async down(queryInterface) {
    const removeColumnIfExists = async (table, column) => {
      try {
        const schema = await queryInterface.describeTable(table);
        if (schema[column]) await queryInterface.removeColumn(table, column);
      } catch (error) {
        if (!/does not exist|unknown/i.test(error.message)) throw error;
      }
    };

    await removeColumnIfExists('purchase_orders', 'expense_type');
    await removeColumnIfExists('purchase_orders', 'expense_category');
    await removeColumnIfExists('purchase_orders', 'expense_label');
    await removeColumnIfExists('purchase_orders', 'expense_date');
  }
};
