
/**
 * Gestion des dates calendaires pour DentalPM.
 * Fuseau horaire : Madagascar (UTC+03:00).
 */

export const CLINIC_TIME_ZONE = 'Indian/Antananarivo';

export function clinicDateISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(part => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function parseCivilDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error('Date civile invalide');
  }

  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Date civile invalide');
  }

  return date;
}

const fromCivil = date => date.toISOString().slice(0, 10);

export function shiftCivilDays(iso, amount) {
  const date = parseCivilDate(iso);
  date.setUTCDate(date.getUTCDate() + amount);
  return fromCivil(date);
}

export function shiftCivilMonths(iso, amount) {
  const date = parseCivilDate(iso);
  const day = date.getUTCDate();

  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount);

  const maxDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate();

  date.setUTCDate(Math.min(day, maxDay));
  return fromCivil(date);
}

export function civilWeekRange(iso) {
  const date = parseCivilDate(iso);
  const offset = (date.getUTCDay() + 6) % 7;
  const from = shiftCivilDays(iso, -offset);

  return {
    from,
    to: shiftCivilDays(from, 6)
  };
}

export function formatCivilDate(iso, options = {}) {
  if (!iso) return '—';

  return parseCivilDate(iso).toLocaleDateString('fr-FR', {
    ...options,
    timeZone: 'UTC'
  });
}
