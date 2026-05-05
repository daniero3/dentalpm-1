'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const addColumnIfMissing = async (table, column, definition) => {
      try {
        await queryInterface.addColumn(table, column, definition);
      } catch (error) {
        if (!/already exists|duplicate column/i.test(error.message)) throw error;
      }
    };

    await addColumnIfMissing('subscriptions', 'monthly_price_mga', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing('subscriptions', 'annual_price_mga', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing('subscriptions', 'max_practitioners', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2,
    });
    await addColumnIfMissing('subscriptions', 'discount_type', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });

    // Backfill monthly/annual pricing from the legacy price_mga column when present.
    await queryInterface.sequelize.query(`
      UPDATE subscriptions
      SET monthly_price_mga = COALESCE(monthly_price_mga, price_mga, 0),
          annual_price_mga  = COALESCE(annual_price_mga, price_mga * 12, 0)
      WHERE monthly_price_mga IS NULL OR annual_price_mga IS NULL OR monthly_price_mga = 0 OR annual_price_mga = 0
    `).catch(() => {});

    // Expand enums used by the live code.
    await queryInterface.sequelize.query(`ALTER TYPE "enum_subscriptions_status" ADD VALUE IF NOT EXISTS 'TRIAL'`).catch(() => {});
    await queryInterface.sequelize.query(`ALTER TYPE "enum_subscriptions_status" ADD VALUE IF NOT EXISTS 'TRIAL_EXPIRED'`).catch(() => {});
    await queryInterface.sequelize.query(`ALTER TYPE "enum_subscriptions_status" ADD VALUE IF NOT EXISTS 'SUPERSEDED'`).catch(() => {});
    await queryInterface.sequelize.query(`ALTER TYPE "enum_subscriptions_billing_cycle" ADD VALUE IF NOT EXISTS 'ANNUAL'`).catch(() => {});

    // Keep legacy yearly rows readable by the newer code.
    await queryInterface.sequelize.query(`
      UPDATE subscriptions
      SET billing_cycle = 'ANNUAL'
      WHERE billing_cycle = 'YEARLY'
    `).catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    // Intentionally non-destructive: we don't remove columns or enum values on down
    // because this migration is meant to normalize a live legacy database.
  }
};
