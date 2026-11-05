/** Nomenclature FDI et lecture des archives de la fiche dentaire. */
const NUM_TO_FDI = Object.fromEntries([
  ['18','17','16','15','14','13','12','11'],
  ['21','22','23','24','25','26','27','28'],
  ['48','47','46','45','44','43','42','41'],
  ['31','32','33','34','35','36','37','38']
].flat().map((fdi, i) => [String(i + 1), fdi]));
const VALID_FDI = new Set([
  ...Object.values(NUM_TO_FDI),
  ...['5','6','7','8'].flatMap(q => ['1','2','3','4','5'].map(n => q + n))
]);
const LEGACY_STATUSES = {
  healthy:'HEALTHY', carious:'CARIES', filled:'FILLED',
  missing:'MISSING', crowned:'CROWN', implant:'IMPLANT'
};
const VALID_TYPES = new Set(['restoration','prosthetics','odf','periodontics','surgery','prevention','endodontics','other']);

function asFDI(value) {
  const raw = String(value || '').trim();
  if (VALID_FDI.has(raw)) return raw;
  return NUM_TO_FDI[raw] || null;
}
function rowFDI(row) {
  // Pour les archives, tooth_position est un index 1..32, tooth_fdi est un code FDI.
  if (row?.tooth_fdi && VALID_FDI.has(String(row.tooth_fdi))) return String(row.tooth_fdi);
  const position = String(row?.tooth_position || '').trim();
  return NUM_TO_FDI[position] || (VALID_FDI.has(position) ? position : null);
}
function parseTeeth(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function appendProcedure(teeth, toothFdi, procedure) {
  // Copie fonctionnelle pour ne jamais modifier le statut clinique ni l'archive source.
  const records = teeth.map(tooth => ({
    ...tooth,
    procedures: Array.isArray(tooth.procedures) ? [...tooth.procedures] : []
  }));
  const existing = records.find(tooth => rowFDI(tooth) === toothFdi);
  if (existing) {
    existing.procedures.push(procedure);
  } else {
    records.push({ tooth_fdi: toothFdi, status: 'healthy', procedures: [procedure], notes: '' });
  }
  return records;
}
module.exports = { NUM_TO_FDI, VALID_FDI, LEGACY_STATUSES, VALID_TYPES, asFDI, rowFDI, parseTeeth, appendProcedure };
