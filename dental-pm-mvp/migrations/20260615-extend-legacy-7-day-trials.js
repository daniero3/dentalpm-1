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
        SELECT id, clinic_id, start_date, end_date, trial_end_date, notes
        FROM subscriptions
        WHERE status = 'TRIAL_EXPIRED'
          AND (notes IS NULL OR notes NOT LIKE :markerPattern)
      `,
      {
        replacements: { markerPattern: `%${MIGRATION_MARKER}%` },
        type: QueryTypes.SELECT,
      }
    );

    let restoredTrials = 0;

    for (const trial of expiredTrials) {
      const startDate = parseDateOnly(trial.start_date);
      const endDate = parseDateOnly(trial.trial_end_date || trial.end_date);

      if (!startDate || !endDate) continue;

      const originalDurationDays = daysBetween(startDate, endDate);
      if (originalDurationDays < 1 || originalDurationDays > 8) continue;

      const existingNotes = trial.notes ? `${trial.notes}\n` : '';
      const notes = `${existingNotes}${MIGRATION_MARKER} Legacy ${originalDurationDays}-day trial topped up by ${LEGACY_TRIAL_TOP_UP_DAYS} days on ${toDateOnly(now)}.`;

      await queryInterface.bulkUpdate(
        'subscriptions',
        {
          status: 'TRIAL',
          end_date: newTrialEnd,
          trial_end_date: newTrialEnd,
          notes,
          updated_at: now,
        },
        { id: trial.id, status: 'TRIAL_EXPIRED' }
      );

      await queryInterface.bulkUpdate(
        'clinics',
        {
          subscription_status: 'TRIAL',
          trial_ends_at: newTrialEnd,
          is_active: true,
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
