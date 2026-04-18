'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ajouter stripe_subscription_id dans subscriptions
    await queryInterface.addColumn('subscriptions', 'stripe_subscription_id', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    }).catch(() => console.log('stripe_subscription_id déjà existant dans subscriptions'));

    // Ajouter stripe_subscription_id dans clinics
    await queryInterface.addColumn('clinics', 'stripe_subscription_id', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    }).catch(() => console.log('stripe_subscription_id déjà existant dans clinics'));

    await queryInterface.addColumn('clinics', 'stripe_customer_id', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    }).catch(() => console.log('stripe_customer_id déjà existant dans clinics'));
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('subscriptions', 'stripe_subscription_id').catch(()=>{});
    await queryInterface.removeColumn('clinics', 'stripe_subscription_id').catch(()=>{});
    await queryInterface.removeColumn('clinics', 'stripe_customer_id').catch(()=>{});
  }
};
