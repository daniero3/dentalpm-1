'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const describe = async () => {
      try {
        return await queryInterface.describeTable('patients');
      } catch (error) {
        return null;
      }
    };

    const changeToNullable = async (column, definition) => {
      const schema = await describe();
      if (!schema || !schema[column]) return;
      await queryInterface.changeColumn('patients', column, {
        ...definition,
        allowNull: true
      });
    };

    await changeToNullable('date_of_birth', { type: Sequelize.DATEONLY });
    await changeToNullable('gender', { type: Sequelize.STRING(10) });
    await changeToNullable('phone_primary', { type: Sequelize.STRING(20) });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('patients', 'date_of_birth', {
      type: Sequelize.DATEONLY,
      allowNull: false
    });
    await queryInterface.changeColumn('patients', 'gender', {
      type: Sequelize.STRING(10),
      allowNull: false
    });
    await queryInterface.changeColumn('patients', 'phone_primary', {
      type: Sequelize.STRING(20),
      allowNull: false
    });
  }
};
