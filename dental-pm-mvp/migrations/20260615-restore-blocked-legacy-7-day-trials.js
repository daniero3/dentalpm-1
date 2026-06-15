'use strict';

const LEGACY_TRIAL_TOP_UP_DAYS = 23;
const MIGRATION_MARKER = '[migration:20260615-restore-blocked-legacy-7-day-trials]';

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(start, end) {
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function planDetails(plan) {
  if (plan === 'ESSENTIAL') return { price: 149000, users: 2 };
  if (plan === 'GROUP') return { price: 299000, users: 50 };
  return { price: 199000, users: 5 };
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const { QueryTypes, Op } = Sequelize;
    const now = new Date();
    const newTrialEnd = toDateOnly(new Date(now.getTime() + LEGACY_TRIAL_TOP_UP_DAYS * 24 * 60 * 60 * 1000));

    const blockedClinics = await sequelize.query(
      `
        SELECT
          c.id AS clinic_id,
          c.created_at AS clinic_created_at,
          c.trial_ends_at AS clinic_trial_ends_at,
          c.current_plan AS clinic_plan,
          c.subscription_status AS clinic_status,
          s.id AS subscription_id,
          s.start_date,
          s.end_date,
          s.trial_end_date,
          s.notes
        FROM clinics c
        LEFT JOIN LATERAL (
          SELECT id, start_date, end_date, trial_end_date, notes
          FROM subscriptions
          WHERE subscriptions.clinic_id = c.id
          ORDER BY subscriptions.created_at DESC
          LIMIT 1
        ) s ON true
        WHERE c.subscription_status IN ('EXPIRED', 'TRIAL_EXPIRED')
          AND COALESCE(c.trial_ends_at, c.created_at) < NOW()
          AND (s.notes IS NULL OR s.notes NOT LIKE :markerPattern)
      `,
      {
        replacements: { markerPattern: `%${MIGRATION_MARKER}%` },
        type: QueryTypes.SELECT,
      }
    );

    let restoredCount = 0;

    for (const clinic of blockedClinics) {
      const startDate = parseDateOnly(clinic.start_date || clinic.clinic_created_at);
      const endDate = parseDateOnly(clinic.trial_end_date || clinic.end_date || clinic.clinic_trial_ends_at);

      if (!startDate || !endDate) continue;

      const originalDurationDays = diffDays(startDate, endDate);
      if (originalDurationDays < 5 || originalDurationDays > 8) continue;

      const plan = ['ESSENTIAL', 'PRO', 'GROUP'].includes(clinic.clinic_plan) ? clinic.clinic_plan : 'PRO';
      const { price, users } = planDetails(plan);
      const notes = `${MIGRATION_MARKER} Legacy ${originalDurationDays}-day trial restored with ${LEGACY_TRIAL_TOP_UP_DAYS} days on ${toDateOnly(now)}.`;

      if (clinic.subscription_id) {
        await queryInterface.bulkUpdate(
          'subscriptions',
          {
            status: 'TRIAL',
            end_date: newTrialEnd,
            trial_end_date: newTrialEnd,
            notes,
            updated_at: now,
          },
          { id: clinic.subscription_id }
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
              :endDate, :price, :price, :annualPrice,
              :users, :notes, :now, :now
            )
          `,
          {
            replacements: {
              clinicId: clinic.clinic_id,
              plan,
              startDate: toDateOnly(now),
              endDate: newTrialEnd,
              price,
              annualPrice: price * 12,
              users,
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
          current_plan: plan,
          updated_at: now,
        },
        { id: clinic.clinic_id }
      );

      restoredCount += 1;
    }

    console.log(`Legacy blocked trial restore: ${restoredCount} clinic(s) restored with ${LEGACY_TRIAL_TOP_UP_DAYS} remaining days.`);
  },

  async down() {
    // Non-destructive.
  },
};
