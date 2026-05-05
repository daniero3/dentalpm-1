'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('counters').catch(() => null);
    if (!tableInfo) {
      await queryInterface.createTable('counters', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        clinic_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'clinics', key: 'id' },
          onDelete: 'CASCADE',
        },
        counter_type: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        current_value: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      }).catch(() => {});
    }

    await queryInterface.addIndex('counters', ['clinic_id', 'counter_type'], {
      unique: true,
      name: 'uniq_counters_clinic_type',
    }).catch(() => {});

    await queryInterface.sequelize.query(`
      INSERT INTO counters (clinic_id, counter_type, current_value, created_at, updated_at)
      SELECT
        clinic_id,
        'patient' AS counter_type,
        COALESCE(MAX(CASE
          WHEN patient_number ~ '^PAT-[0-9]+$' THEN regexp_replace(patient_number, '[^0-9]', '', 'g')::integer
          ELSE 0
        END), 0) AS current_value,
        NOW(),
        NOW()
      FROM patients
      WHERE clinic_id IS NOT NULL
      GROUP BY clinic_id
      ON CONFLICT (clinic_id, counter_type) DO UPDATE
        SET current_value = GREATEST(counters.current_value, EXCLUDED.current_value),
            updated_at = NOW()
    `).catch(() => {});
  },

  async down() {
    // Keep counters table for compatibility.
  }
};
