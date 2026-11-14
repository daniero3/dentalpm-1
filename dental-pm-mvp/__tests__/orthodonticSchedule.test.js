'use strict';
const { buildPlan, dateOnly, monthDate, computeDueStatus } = require('../utils/orthodontics');

describe('Orthodontie : échéanciers de règlement', () => {
  test('repartit un forfait entre acompte et 12 échéances sans créer de facture', () => {
    const result = buildPlan({
      billing_mode:'FORFAIT', total_mga:3600000, upfront_mga:600000,
      months:12, first_due_date:'2026-01-15'
    });
    expect(result.dues).toHaveLength(13);
    expect(result.dues[0]).toEqual({ sequence:0, due_date:'2026-01-15', amount_mga:600000 });
    expect(result.dues[1].due_date).toBe('2026-02-15');
    expect(result.dues.reduce((sum,row)=>sum+row.amount_mga,0)).toBe(3600000);
    expect(result.dues.every(row=>row.invoice_id === undefined)).toBe(true);
  });

  test('affecte les arrondis au dernier mois sans perte d’ariary', () => {
    const result = buildPlan({
      billing_mode:'FORFAIT', total_mga:1000, upfront_mga:100,
      months:7, first_due_date:'2026-01-31'
    });
    expect(result.dues.reduce((sum,row)=>sum+row.amount_mga,0)).toBe(1000);
    expect(result.dues[1].due_date).toBe('2026-02-28');
    expect(result.dues[2].due_date).toBe('2026-03-31');
    expect(result.dues[7].amount_mga).toBe(132);
  });

  test('honoraires mensuels : périodes finies, sans dette globale présumée', () => {
    const plan = buildPlan({
      billing_mode:'MONTHLY', monthly_mga:180000, months:4, first_due_date:'2026-01-31'
    });
    expect(plan.total_mga).toBeNull();
    expect(plan.dues.map(row=>row.due_date)).toEqual([
      '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'
    ]);
    expect(plan.dues.map(row=>row.amount_mga)).toEqual([180000,180000,180000,180000]);
  });

  test('rejette montants invalides et échéanciers excessifs', () => {
    expect(() => buildPlan({ billing_mode:'FORFAIT', total_mga:1000,upfront_mga:1100, months:4,first_due_date:'2026-01-15' })).toThrow();
    expect(() => buildPlan({ billing_mode:'MONTHLY', monthly_mga:-1,months:5,first_due_date:'2026-01-15' })).toThrow();
    expect(() => buildPlan({ billing_mode:'MONTHLY', monthly_mga:100,months:61,first_due_date:'2026-01-15' })).toThrow();
    expect(() => buildPlan({ billing_mode:'MONTHLY', monthly_mga:100,months:1,first_due_date:'2026-02-30' })).toThrow();
    expect(dateOnly('2026-02-30')).toBeNull();
    expect(monthDate('2026-01-31', 1)).toBe('2026-02-28');
  });

  test('une échéance non facturée peut être en retard contractuel sans devenir une facture impayée', () => {
    const due = { sequence:1, due_date:'2026-01-05', amount_mga:150000 };
    const unbilled = computeDueStatus(due,0,'2026-04-01',false);
    expect(unbilled.status).toBe('UNBILLED');
    expect(unbilled.is_overdue).toBe(true);
    expect(unbilled.overdue_mga).toBe(150000);
    expect(computeDueStatus(due,0,'2026-04-01',true).status).toBe('OVERDUE');
    expect(computeDueStatus(due,50000,'2026-04-01',true).outstanding_mga).toBe(100000);
    expect(computeDueStatus(due,50000,'2026-04-01',true).overdue_mga).toBe(100000);
    expect(computeDueStatus(due,150000,'2026-04-01',true).status).toBe('PAID');
    expect(computeDueStatus(due,150000,'2026-04-01',true).overdue_mga).toBe(0);
  });

  test('janvier payé : février à novembre sont 10 mensualités échues le 14 novembre', () => {
    const plan = buildPlan({
      billing_mode:'MONTHLY', monthly_mga:250000, months:12, first_due_date:'2026-01-13'
    });
    const calculate = today => plan.dues.map((due, index) =>
      computeDueStatus(due, index === 0 ? 250000 : 0, today, index === 0)
    ).reduce((total, due) => total + due.overdue_mga, 0);

    expect(calculate('2026-11-12')).toBe(2250000);
    expect(calculate('2026-11-13')).toBe(2500000);
    expect(calculate('2026-11-14')).toBe(2500000);
    expect(calculate('2026-12-12')).toBe(2500000);
    expect(calculate('2026-12-13')).toBe(2750000);
  });

  test('ne compte ni échéance future ni avance payée, et déduit un règlement partiel', () => {
    const due = { sequence:2, due_date:'2026-11-13', amount_mga:250000 };
    expect(computeDueStatus(due,100000,'2026-11-12',true).overdue_mga).toBe(0);
    const partial = computeDueStatus(due,100000,'2026-11-13',true);
    expect(partial.is_overdue).toBe(true);
    expect(partial.overdue_mga).toBe(150000);
    expect(computeDueStatus(due,300000,'2026-11-13',true).overdue_mga).toBe(0);
  });
});
