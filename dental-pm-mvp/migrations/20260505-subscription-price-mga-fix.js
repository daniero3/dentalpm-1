'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('subscriptions').catch(() => null);
    const hasPrice = !!tableInfo?.price_mga;

    if (hasPrice) {
      await queryInterface.sequelize.query(`
        UPDATE subscriptions
        SET price_mga = COALESCE(price_mga, monthly_price_mga, annual_price_mga / 12, 0)
        WHERE price_mga IS NULL OR price_mga = 0
      `).catch(() => {});

      await queryInterface.changeColumn('subscriptions', 'price_mga', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      }).catch(() => {});
    } else {
      await queryInterface.addColumn('subscriptions', 'price_mga', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      }).catch(() => {});
    }

    await queryInterface.sequelize.query(`
      UPDATE subscriptions
      SET price_mga = COALESCE(price_mga, monthly_price_mga, annual_price_mga / 12, 0)
      WHERE price_mga IS NULL OR price_mga = 0
    `).catch(() => {});
  },

  async down() {
    // Non-destructive: keep legacy compatibility data intact.
  }
};
