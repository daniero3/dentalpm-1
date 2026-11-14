'use strict';

const dateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return value;
};

const positiveMoney = (value, allowZero = false) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number <= 9999999999 &&
    (allowZero ? number >= 0 : number > 0);
};

function monthDate(firstDate, offset) {
  const [year, month, day] = firstDate.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDay = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
  cursor.setUTCDate(Math.min(day, lastDay));
  return cursor.toISOString().slice(0, 10);
}

function buildPlan(input) {
  const mode = input.billing_mode;
  const first = dateOnly(input.first_due_date);
  const months = Number(input.months);
  if (!first || !Number.isInteger(months) || months < 1 || months > 60) {
    throw new Error('Échéancier invalide : date ISO et 1 à 60 mensualités requises');
  }

  const dues = [];
  if (mode === 'FORFAIT') {
    const total = Number(input.total_mga);
    const upfront = Number(input.upfront_mga || 0);
    if (!positiveMoney(total) || !positiveMoney(upfront, true) || upfront >= total) {
      throw new Error('Forfait invalide : montant total et acompte requis');
    }
    const remaining = total - upfront;
    const basic = Math.floor(remaining / months);
    if (basic <= 0) throw new Error('Le montant global est insuffisant pour cet échéancier');
    const rest = remaining - basic * months;
    if (upfront > 0) {
      dues.push({ sequence: 0, due_date: first, amount_mga: upfront });
    }
    for (let i = 0; i < months; i++) {
      dues.push({ sequence: i + 1, due_date: monthDate(first, i + (upfront > 0 ? 1 : 0)), amount_mga: basic + (i === months - 1 ? rest : 0) });
    }
    return { total_mga: total, upfront_mga: upfront, monthly_mga: basic, dues };
  }
  if (mode === 'MONTHLY') {
    const monthly = Number(input.monthly_mga);
    if (!positiveMoney(monthly)) throw new Error('Honoraires mensuels invalides');
    for (let i = 0; i < months; i++) {
      dues.push({ sequence: i + 1, due_date: monthDate(first, i), amount_mga: monthly });
    }
    return { total_mga: null, upfront_mga: 0, monthly_mga: monthly, dues };
  }
  throw new Error('Mode financier non reconnu');
}

// Paid amounts come ONLY from existing completed DentalPM payments.
// Contractual arrears are independent from invoice issuance: an unpaid instalment
// becomes due on its due_date (inclusive), even if no invoice has been linked yet.
// Keep status UNBILLED for accounting visibility; is_overdue and overdue_mga
// separately describe the contractual payment obligation.
function computeDueStatus(record, paid, today, invoiced) {
  const amount = Number(record.amount_mga);
  const applied = Math.max(0, Math.min(amount, Number(paid) || 0));
  const rest = amount - applied;
  const isOverdue = rest > 0 && record.due_date <= today;
  let status = 'UNBILLED';
  if (invoiced) {
    status = rest === 0 ? 'PAID' : isOverdue ? 'OVERDUE' : applied > 0 ? 'PARTIAL' : 'PENDING';
  }
  return {
    ...record,
    amount_mga: amount,
    paid_mga: applied,
    outstanding_mga: rest,
    status,
    is_overdue: isOverdue,
    overdue_mga: isOverdue ? rest : 0
  };
}

module.exports = { dateOnly, positiveMoney, monthDate, buildPlan, computeDueStatus };
