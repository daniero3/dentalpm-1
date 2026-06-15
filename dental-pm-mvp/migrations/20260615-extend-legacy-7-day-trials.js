'use strict';

const LEGACY_TRIAL_TOP_UP_DAYS = 23;
const MIGRATION_MARKER = '[migration:20260615-extend-legacy-7-day-trials]';

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start, end) {
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const { QueryTypes, Op } = Sequelize;
    const now = new Date();
    const newTrialEnd = toDateOnly(new Date(now.getTime() + LEGACY_TRIAL_TOP_UP_DAYS * 24 * 60 * 60 * 1000));

    const expiredTrials = await sequelize.query(
      `
        SELECT
          c.id AS clinic_id,
          c.created_at AS clinic_created_at,
          c.trial_ends_at AS clinic_trial_ends_at,
          c.current_plan AS clinic_plan,
          s.id AS subscription_id,
          s.status AS subscription_status,
          s.start_date,
          s.end_date,
          s.trial_end_date,
          s.notes
        FROM clinics c
        LEFT JOIN LATERAL (
          SELECT id, status, start_date, end_date, trial_end_date, notes
          FROM subscriptions
          WHERE subscriptions.clinic_id = c.id
            AND subscriptions.status IN ('TRIAL_EXPIRED', 'EXPIRED', 'PENDING', 'TRIAL')
          ORDER BY subscriptions.created_at DESC
          LIMIT 1
        ) s ON true
        WHERE c.subscription_status IN ('TRIAL_EXPIRED', 'EXPIRED')
          AND c.trial_ends_at IS NOT NULL
          AND c.trial_ends_at < NOW()
          AND (s.notes IS NULL OR s.notes NOT LIKE :markerPattern)
      `,
      {
        replacements: { markerPattern: `%${MIGRATION_MARKER}%` },
        type: QueryTypes.SELECT,
      }
    );

    let restoredTrials = 0;

    for (const trial of expiredTrials) {
      const startDate = parseDateOnly(trial.start_date || trial.clinic_created_at);
      const endDate = parseDateOnly(trial.trial_end_date || trial.end_date || trial.clinic_trial_ends_at);

      if (!startDate || !endDate) continue;

      const originalDurationDays = daysBetween(startDate, endDate);
      if (originalDurationDays < 1 || originalDurationDays > 8) continue;

      const existingNotes = trial.notes ? `${trial.notes}\n` : '';
      const notes = `${existingNotes}${MIGRATION_MARKER} Legacy ${originalDurationDays}-day trial topped up by ${LEGACY_TRIAL_TOP_UP_DAYS} days on ${toDateOnly(now)}.`;

      if (trial.subscription_id) {
        await queryInterface.bulkUpdate(
          'subscriptions',
          {
            status: 'TRIAL',
            end_date: newTrialEnd,
            trial_end_date: newTrialEnd,
            notes,
            updated_at: now,
          },
          {
            id: trial.subscription_id,
            status: { [Op.in]: ['TRIAL_EXPIRED', 'EXPIRED', 'PENDING', 'TRIAL'] },
          }
        );
      } else {
        await sequelize.query(
          `
            INSERT INTO subscriptions (
              id, clinic_id, plan, status, billing_cycle, start_date, end_date,
              trial_end_date, price_mga, monthly_price_mga, annual_price_mga,
              max_practitioners, notes, created_at, updated_at
            )
            VALUES (
              uuid_generate_v4(), :clinicId, :plan, 'TRIAL', 'MONTHLY', :startDate, :endDate,
              :endDate, :monthlyPrice, :monthlyPrice, :annualPrice,
              :maxPractitioners, :notes, :now, :now
            )
          `,
          {
            replacements: {
              clinicId: trial.clinic_id,
              plan: ['ESSENTIAL', 'PRO', 'GROUP'].includes(trial.clinic_plan) ? trial.clinic_plan : 'PRO',
              startDate: toDateOnly(now),
              endDate: newTrialEnd,
              monthlyPrice: trial.clinic_plan === 'ESSENTIAL' ? 149000 : trial.clinic_plan === 'GROUP' ? 299000 : 199000,
              annualPrice: (trial.clinic_plan === 'ESSENTIAL' ? 149000 : trial.clinic_plan === 'GROUP' ? 299000 : 199000) * 12,
              maxPractitioners: trial.clinic_plan === 'ESSENTIAL' ? 2 : trial.clinic_plan === 'GROUP' ? 50 : 5,
              notes,
              now,
            },
          }
        );
      }

      await queryInterface.bulkUpdate(
        'clinics',
        {
          subscription_status: 'TRIAL',
          trial_ends_at: newTrialEnd,
          is_active: true,
          current_plan: ['ESSENTIAL', 'PRO', 'GROUP'].includes(trial.clinic_plan) ? trial.clinic_plan : 'PRO',
          updated_at: now,
        },
        {
          id: trial.clinic_id,
          subscription_status: { [Op.in]: ['TRIAL_EXPIRED', 'EXPIRED'] },
        }
      );

      restoredTrials += 1;
    }

    console.log(`Legacy short trial top-up: ${restoredTrials} trial(s) restored with ${LEGACY_TRIAL_TOP_UP_DAYS} remaining days.`);
  },

  async down() {
    // Intentionally non-destructive: do not re-block clinics that were granted
    // their remaining legacy trial days.
  },
};
