export const normalizeSearch = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const normalizeDigits = (value = '') =>
  value.toString().replace(/\D/g, '');

export const buildSearchText = (...values) =>
  normalizeSearch(values.filter(Boolean).join(' '));

export const matchesSearch = (query, ...values) => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;

  const haystack = buildSearchText(...values);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const textMatch = terms.every(term => haystack.includes(term));

  const queryDigits = normalizeDigits(query);
  const digitMatch = queryDigits.length > 0
    && normalizeDigits(values.filter(Boolean).join(' ')).includes(queryDigits);

  return textMatch || digitMatch;
};

export const patientSearchText = (patient = {}) => {
  const firstName = patient.first_name || '';
  const lastName = patient.last_name || '';
  return [
    patient.patient_number,
    firstName,
    lastName,
    `${firstName} ${lastName}`.trim(),
    `${lastName} ${firstName}`.trim(),
    patient.phone_primary,
    patient.phone_secondary,
    patient.email,
    patient.address,
    patient.city
  ].filter(Boolean).join(' ');
};
