'use strict';

const LEGACY_TRIAL_TOP_UP_DAYS = 23;
const LEGACY_CUTOFF_DATE = '2026-06-15';
const MIGRATION_MARKER = '[migration:20260615-backfill-unrestored-legacy-7-day-trials]';
const PREVIOUS_MARKERS = [
  '[migration:20260615-extend-legacy-7-day-trials]',
  '[migration:20260615-restore-blocked-legacy-7-day-trials]',
];

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

function planDetails(plan) {
  if (plan === 'ESSENTIAL') return { plan, price: 149000, users: 2 };
  if (plan === 'GROUP') return { plan, price: 299000, users: 50 };
  return { plan: 'PRO', price: 199000, users: 5 };
}

function hasAnyMarker(notes) {
  return [MIGRATION_MARKER, ...PREVIOUS_MARKERS].some((marker) => notes?.includes(marker));
}

function markerWhereClause(alias = 's') {
  return [MIGRATION_MARKER, ...PREVIOUS_MARKERS]
    .map((marker) => `${alias}.notes LIKE '%${marker}%'`)
    .join(' OR ');
}

function inferTrialDurationDays(row) {
  const start = parseDateOnly(row.subscription_start_date || row.clinic_created_at);
  const end = parseDateOnly(row.subscription_trial_end_date || row.subscription_end_date || row.clinic_trial_ends_at);
  if (!start || !end) return null;
  return daysBetween(start, end);
}

function isLikelyUnrestoredLegacyTrial(row) {
  if (hasAnyMarker(row.subscription_notes)) return false;

  const hasTrialSignal = Boolean(row.clinic_trial_ends_at)
    || Boolean(row.subscription_trial_end_date)
    || row.clinic_status === 'TRIAL_EXPIRED'
    || row.subscription_status === 'TRIAL_EXPIRED';
  if (!hasTrialSignal) return false;

  const duration = inferTrialDurationDays(row);
  if (duration !== null) return duration >= 1 && duration <= 8;

  const createdAt = parseDateOnly(row.clinic_created_at);
  if (!createdAt) return false;

  return toDateOnly(createdAt) < LEGACY_CUTOFF_DATE;
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
          s.status AS subscription_status,
          s.start_date AS subscription_start_date,
          s.end_date AS subscription_end_date,
          s.trial_end_date AS subscription_trial_end_date,
          s.notes AS subscription_notes
        FROM clinics c
        LEFT JOIN LATERAL (
          SELECT id, status, start_date, end_date, trial_end_date, notes
          FROM subscriptions
          WHERE subscriptions.clinic_id = c.id
          ORDER BY subscriptions.created_at DESC
          LIMIT 1
        ) s ON true
        WHERE c.subscription_status IN ('EXPIRED', 'TRIAL_EXPIRED', 'TRIAL', 'PENDING')
          AND (
            c.is_active = false
            OR c.subscription_status IN ('EXPIRED', 'TRIAL_EXPIRED', 'PENDING')
            OR c.trial_ends_at < CURRENT_DATE
          )
          AND c.created_at < :cutoffDate
          AND NOT EXISTS (
            SELECT 1
            FROM subscriptions active_paid_subscriptions
            WHERE active_paid_subscriptions.clinic_id = c.id
              AND active_paid_subscriptions.status = 'ACTIVE'
              AND active_paid_subscriptions.end_date >= CURRENT_DATE
          )
      `,
      {
        replacements: { cutoffDate: LEGACY_CUTOFF_DATE },
        type: QueryTypes.SELECT,
      }
    );

    let restoredCount = 0;

    for (const clinic of blockedClinics) {
      if (!isLikelyUnrestoredLegacyTrial(clinic)) continue;

      const planInfo = planDetails(clinic.clinic_plan);
      const duration = inferTrialDurationDays(clinic);
      const previousNotes = clinic.subscription_notes ? `${clinic.subscription_notes}\n` : '';
      const notes = `${previousNotes}${MIGRATION_MARKER} Legacy ${duration || 'short'}-day trial restored with ${LEGACY_TRIAL_TOP_UP_DAYS} days on ${toDateOnly(now)}.`;

      if (clinic.subscription_id) {
        await queryInterface.bulkUpdate(
          'subscriptions',
          {
            status: 'TRIAL',
            plan: planInfo.plan,
            end_date: newTrialEnd,
            trial_end_date: newTrialEnd,
            monthly_price_mga: planInfo.price,
            annual_price_mga: planInfo.price * 12,
            price_mga: planInfo.price,
            max_practitioners: planInfo.users,
            notes,
            updated_at: now,
          },
          {
            id: clinic.subscription_id,
            status: { [Op.in]: ['EXPIRED', 'TRIAL_EXPIRED', 'PENDING', 'TRIAL'] },
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
              :endDate, :price, :price, :annualPrice,
              :users, :notes, :now, :now
            )
          `,
          {
            replacements: {
              clinicId: clinic.clinic_id,
              plan: planInfo.plan,
              startDate: toDateOnly(now),
              endDate: newTrialEnd,
              price: planInfo.price,
              annualPrice: planInfo.price * 12,
              users: planInfo.users,
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
          current_plan: planInfo.plan,
          max_users: planInfo.users,
          updated_at: now,
        },
        {
          id: clinic.clinic_id,
          subscription_status: { [Op.in]: ['EXPIRED', 'TRIAL_EXPIRED', 'TRIAL', 'PENDING'] },
        }
      );

      restoredCount += 1;
    }

    const repairResponse = await sequelize.query(
      `
        UPDATE clinics c
        SET
          subscription_status = 'TRIAL',
          trial_ends_at = s.trial_end_date,
          is_active = true,
          current_plan = COALESCE(c.current_plan::text, s.plan::text)::"enum_clinics_current_plan",
          max_users = COALESCE(s.max_practitioners, c.max_users),
          updated_at = :now
        FROM subscriptions s
        WHERE s.clinic_id = c.id
          AND s.status = 'TRIAL'
          AND s.trial_end_date >= CURRENT_DATE
          AND (${markerWhereClause('s')})
          AND (
            c.subscription_status <> 'TRIAL'
            OR c.is_active = false
            OR c.trial_ends_at IS NULL
            OR c.trial_ends_at::date <> s.trial_end_date
          )
          AND NOT EXISTS (
            SELECT 1
            FROM subscriptions active_paid_subscriptions
            WHERE active_paid_subscriptions.clinic_id = c.id
              AND active_paid_subscriptions.status = 'ACTIVE'
              AND active_paid_subscriptions.end_date >= CURRENT_DATE
          )
      `,
      { replacements: { now } }
    );

    const repairMetadata = Array.isArray(repairResponse)
      ? (repairResponse[1] || repairResponse[0])
      : repairResponse;
    const repairedCount = repairMetadata?.rowCount || repairMetadata?.affectedRows || 0;
    if (repairedCount) {
      console.log(`Legacy trial access repair: ${repairedCount} clinic(s) reactivated from marked trial subscriptions.`);
    }

    console.log(`Unrestored legacy trial backfill: ${restoredCount} clinic(s) restored with ${LEGACY_TRIAL_TOP_UP_DAYS} remaining days.`);
  },

  async down() {
    // Non-destructive: do not remove access that was granted as trial credit.
  },

  _private: {
    inferTrialDurationDays,
    isLikelyUnrestoredLegacyTrial,
    markerWhereClause,
  },
};
