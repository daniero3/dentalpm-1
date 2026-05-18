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

const uniqueTerms = value => [...new Set(value.split(/\s+/).filter(Boolean))];

export const matchesSearch = (query, ...values) => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;

  const haystack = buildSearchText(...values);
  const terms = uniqueTerms(normalizedQuery);
  const textMatch = terms.every(term => haystack.includes(term));

  const queryDigits = normalizeDigits(query);
  const digitMatch = queryDigits.length > 0
    && normalizeDigits(values.filter(Boolean).join(' ')).includes(queryDigits);

  return textMatch || digitMatch;
};

export const scoreSearchMatch = (query, ...values) => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return 0;

  const haystack = buildSearchText(...values);
  const rawHaystack = values.filter(Boolean).join(' ');
  const digitHaystack = normalizeDigits(rawHaystack);
  const terms = uniqueTerms(normalizedQuery);

  if (!matchesSearch(query, ...values)) return 0;

  let score = 1;
  if (haystack === normalizedQuery) score += 120;
  if (haystack.includes(normalizedQuery)) score += 60;

  const words = haystack.split(/\s+/).filter(Boolean);
  terms.forEach(term => {
    if (words.includes(term)) score += 35;
    else if (words.some(word => word.startsWith(term))) score += 22;
    else if (haystack.includes(term)) score += 12;
  });

  const queryDigits = normalizeDigits(query);
  if (queryDigits) {
    if (digitHaystack === queryDigits) score += 80;
    else if (digitHaystack.includes(queryDigits)) score += 45;
  }

  return score;
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
    patient.city,
    patient.postal_code,
    patient.emergency_contact_name,
    patient.emergency_contact_phone,
    patient.emergency_contact_relationship,
    patient.insurance_provider,
    patient.insurance_number,
    patient.occupation,
    patient.notes
  ].filter(Boolean).join(' ');
};

export const patientIdentifier = (patient = {}) => {
  if (patient.patient_number) return patient.patient_number;
  if (patient.id) return `PAT-${patient.id.toString().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  return 'ID à générer';
};
