'use strict';
const express = require('express');
const { Op } = require('sequelize');
const { Patient, Appointment, Invoice, Payment, OrthodonticCase, OrthodonticDue, OrthodonticVisit, sequelize } = require('../models');
const { requirePermission, hasPermission } = require('../utils/permissions');
const { dateOnly, buildPlan, computeDueStatus } = require('../utils/orthodontics');

const router = express.Router();
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const clinicId = req => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id;
const todayISO = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone:'Indian/Antananarivo', year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(new Date());
  const d = Object.fromEntries(parts.map(part => [part.type,part.value]));
  return d.year + '-' + d.month + '-' + d.day;
};
const mayViewFinance = req => hasPermission(req.user?.role, 'payments', 'read');

async function findCase(req, id) {
  return OrthodonticCase.findOne({
    where: { id, clinic_id: clinicId(req) },
    include: [
      { model: Patient, as: 'patient', attributes: ['id','first_name','last_name','patient_number','phone_primary'] },
      { model: OrthodonticDue, as: 'dues', separate: true, order: [['sequence', 'ASC']] },
      { model: OrthodonticVisit, as: 'visits', separate: true, order: [['visit_date', 'DESC']] }
    ]
  });
}

async function financialDetails(record) {
  const dues = (record.dues || []).map(d => d.toJSON ? d.toJSON() : d).sort((a,b) => a.sequence - b.sequence);
  const invoiceIds = record.billing_mode === 'FORFAIT'
    ? [record.global_invoice_id].filter(Boolean)
    : dues.map(d => d.invoice_id).filter(Boolean);
  const invoices = invoiceIds.length
    ? await Invoice.findAll({
        where: { id: { [Op.in]: invoiceIds }, clinic_id: record.clinic_id, patient_id: record.patient_id },
        attributes: ['id','invoice_number','total_mga','status','invoice_date']
      })
    : [];
  const payments = invoices.length
    ? await Payment.findAll({
        where: { invoice_id: { [Op.in]: invoices.map(i => i.id) }, status: 'COMPLETED' },
        attributes: ['id','invoice_id','amount_mga','payment_date','payment_method','payment_number'],
        order: [['payment_date','ASC'],['created_at','ASC']]
      })
    : [];
  const sums = new Map();
  payments.forEach(p => sums.set(p.invoice_id, (sums.get(p.invoice_id) || 0) + Number(p.amount_mga)));
  const stamp = todayISO();
  let fixedRemaining = Number(sums.get(record.global_invoice_id) || 0);
  const detailDues = dues.map(d => {
    const id = record.billing_mode === 'FORFAIT' ? record.global_invoice_id : d.invoice_id;
    const isInvoiced = invoices.some(inv => inv.id === id);
    const available = record.billing_mode === 'FORFAIT' ? fixedRemaining : Number(sums.get(id) || 0);
    const result = computeDueStatus(d, available, stamp, isInvoiced);
    if (record.billing_mode === 'FORFAIT') fixedRemaining = Math.max(0, fixedRemaining - Number(d.amount_mga));
    return result;
  });
  const paid = payments.reduce((sum, p) => sum + Number(p.amount_mga), 0);
  const invoiced = invoices.reduce((sum, i) => sum + Number(i.total_mga), 0);
  // Contractual arrears include unpaid due instalments even when no invoice exists.
  // The accounting invoice balance is calculated separately below.
  const late = detailDues.reduce((sum, d) => sum + d.overdue_mga, 0);
  const unbilledOverdue = detailDues.reduce(
    (sum, d) => sum + (d.status === 'UNBILLED' ? d.overdue_mga : 0), 0
  );
  const unbilled = detailDues.filter(d => d.status === 'UNBILLED' && d.due_date <= stamp).length;
  return {
    dues: detailDues,
    invoices: invoices.map(i => i.toJSON()),
    payments: payments.map(p => p.toJSON()),
    totals: {
      billed_mga: invoiced,
      paid_mga: paid,
      balance_mga: Math.max(0, invoiced - paid),
      overdue_mga: late,
      overdue_unbilled_mga: unbilledOverdue,
      unbilled_due_periods: unbilled
    }
  };
}

// Cases and their derived financial state. No new accounting records are generated.
router.get('/', requirePermission('patients','read'), async (req, res) => {
  try {
    const clinic = clinicId(req);
    if (!clinic) return res.status(403).json({ error:'Cabinet non identifié' });
    const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
    const limit = 20;
    const status = String(req.query.status || 'ACTIVE');
    const where = { clinic_id: clinic };
    if (req.query.patient_id) {
      if (!uuid(req.query.patient_id)) return res.status(400).json({ error:'Patient invalide' });
      where.patient_id = req.query.patient_id;
    }
    if (status !== 'ALL') {
      if (!['ACTIVE','PLANNED','PAUSED','COMPLETED','CANCELLED'].includes(status)) return res.status(400).json({ error:'Statut invalide' });
      where.status = status;
    }
    const search = String(req.query.q || '').trim().slice(0, 80);
    const patientInclude = {
      model: Patient, as: 'patient', required: true,
      attributes: ['id','first_name','last_name','patient_number'],
      where: { clinic_id: clinic }
    };
    if (search) {
      const needle = '%' + search + '%';
      patientInclude.where[Op.or] = [
        { first_name:{ [Op.iLike]:needle } },
        { last_name:{ [Op.iLike]:needle } },
        { patient_number:{ [Op.iLike]:needle } },
        { phone_primary:{ [Op.iLike]:needle } }
      ];
    }
    const { rows, count } = await OrthodonticCase.findAndCountAll({
      where, limit, offset: (page - 1) * limit, distinct: true,
      order: [['created_at','DESC']],
      include: [patientInclude]
    });
    const cases = await Promise.all(rows.map(async (row) => {
      const data = row.toJSON();
      if (!mayViewFinance(req)) {
        delete data.total_mga;
        delete data.monthly_mga;
        delete data.upfront_mga;
        delete data.first_due_date;
        delete data.months;
        delete data.billing_mode;
        delete data.global_invoice_id;
      }
      if (mayViewFinance(req)) {
        const record = await OrthodonticCase.findOne({ where: { id: row.id, clinic_id: clinic }, include: [{ model: OrthodonticDue, as: 'dues' }] });
        data.finance = (await financialDetails(record)).totals;
      }
      const visit = await OrthodonticVisit.findOne({ where: { case_id:row.id, clinic_id:clinic, next_visit_date:{ [Op.gte]:todayISO() } }, order: [['next_visit_date','ASC']] });
      data.next_visit_date = visit?.next_visit_date || null;
      return data;
    }));
    res.json({ cases, pagination: { page, per_page:limit, total:count, pages:Math.ceil(count/limit) } });
  } catch (error) { res.status(500).json({ error:'Liste orthodontique indisponible' }); }
});

router.post('/', requirePermission('patients','write'), requirePermission('invoices','write'), async (req, res) => {
  const body = req.body || {};
  try {
    if (!uuid(body.patient_id) || !dateOnly(body.start_date) || !['FIXED','ALIGNERS','REMOVABLE','MIXED','OTHER'].includes(body.appliance_type)) {
      return res.status(400).json({ error:'Patient, date ou type d’appareil invalide' });
    }
    if (body.expected_end_date && !dateOnly(body.expected_end_date)) return res.status(400).json({ error:'Date prévisionnelle invalide' });
    if (body.clinical_notes && String(body.clinical_notes).length > 4000) return res.status(400).json({ error:'Note trop longue' });
    const clinic = clinicId(req);
    if (!clinic) return res.status(403).json({ error:'Cabinet non identifié' });
    const patient = await Patient.findOne({ where: { id:body.patient_id, clinic_id:clinic } });
    if (!patient) return res.status(404).json({ error:'Patient non trouvé dans ce cabinet' });
    let plan;
    try { plan = buildPlan(body); }
    catch (error) { return res.status(400).json({ error:error.message }); }
    const created = await sequelize.transaction(async transaction => {
      const record = await OrthodonticCase.create({
        clinic_id:clinic, patient_id:body.patient_id,
        appliance_type:body.appliance_type,
        status:'ACTIVE', start_date:body.start_date,
        expected_end_date:body.expected_end_date || null,
        clinical_notes:String(body.clinical_notes || ''),
        billing_mode:body.billing_mode,
        months:Number(body.months),
        first_due_date:body.first_due_date,
        total_mga:plan.total_mga,
        upfront_mga:plan.upfront_mga,
        monthly_mga:plan.monthly_mga
      }, { transaction });
      await OrthodonticDue.bulkCreate(plan.dues.map(d => ({ ...d, clinic_id:clinic, case_id:record.id })), { transaction });
      return record;
    });
    res.status(201).json({ case_id:created.id });
  } catch (error) { res.status(500).json({ error:'Impossible de créer le dossier ODF' }); }
});

router.get('/:id', requirePermission('patients','read'), async (req, res) => {
  if (!uuid(req.params.id)) return res.status(400).json({ error:'Identifiant invalide' });
  try {
    const record = await findCase(req, req.params.id);
    if (!record) return res.status(404).json({ error:'Dossier orthodontique introuvable' });
    const result = { case:record.toJSON() };
    if (mayViewFinance(req)) result.finance = await financialDetails(record);
    else {
      delete result.case.dues;
      delete result.case.total_mga;
      delete result.case.monthly_mga;
      delete result.case.upfront_mga;
      delete result.case.global_invoice_id;
      delete result.case.billing_mode;
      delete result.case.first_due_date;
      delete result.case.months;
    }
    res.json(result);
  } catch (error) { res.status(500).json({ error:'Dossier orthodontique indisponible' }); }
});

router.post('/:id/visits', requirePermission('dental_chart','write'), async (req, res) => {
  const body = req.body || {};
  if (!uuid(req.params.id) || !dateOnly(body.visit_date) || (body.next_visit_date && !dateOnly(body.next_visit_date)) ||
      String(body.notes || '').length > 4000 || (body.appointment_id && !uuid(body.appointment_id))) {
    return res.status(400).json({ error:'Données de contrôle invalides' });
  }
  try {
    const record = await OrthodonticCase.findOne({ where: { id:req.params.id, clinic_id:clinicId(req) } });
    if (!record) return res.status(404).json({ error:'Dossier non trouvé' });
    if (body.appointment_id) {
      const appt = await Appointment.findOne({ where: { id:body.appointment_id, clinic_id:record.clinic_id, patient_id:record.patient_id } });
      if (!appt) return res.status(400).json({ error:'Rendez-vous incompatible avec ce dossier' });
    }
    const visit = await OrthodonticVisit.create({
      clinic_id:record.clinic_id, case_id:record.id,
      visit_date:body.visit_date, next_visit_date:body.next_visit_date || null,
      appointment_id:body.appointment_id || null, notes:String(body.notes || '')
    });
    res.status(201).json({ visit });
  } catch (error) { res.status(500).json({ error:'Contrôle non enregistré' }); }
});

// List only eligible invoices for this patient; link them, never recreate them.
router.get('/:id/invoices', requirePermission('invoices','read'), async (req, res) => {
  try {
    const record = await OrthodonticCase.findOne({ where:{ id:req.params.id, clinic_id:clinicId(req) } });
    if (!record) return res.status(404).json({ error:'Dossier non trouvé' });
    const invoices = await Invoice.findAll({
      where: { clinic_id:record.clinic_id, patient_id:record.patient_id,
        document_type:'INVOICE', status:{ [Op.ne]:'CANCELLED' } },
      order: [['invoice_date','DESC']], limit:100,
      attributes:['id','invoice_number','total_mga','status','document_type','invoice_date']
    });
    const ids = invoices.map(i => i.id);
    if (!ids.length) return res.json({ invoices:[] });
    // Identify links to any ODF case without changing accounting records.
    const [linkedCases, linkedDues, payments] = await Promise.all([
      OrthodonticCase.findAll({
        where: { clinic_id:record.clinic_id, global_invoice_id:{ [Op.in]:ids } },
        attributes:['id','global_invoice_id']
      }),
      OrthodonticDue.findAll({
        where: { clinic_id:record.clinic_id, invoice_id:{ [Op.in]:ids } },
        attributes:['case_id','invoice_id']
      }),
      Payment.findAll({
        where: { invoice_id:{ [Op.in]:ids }, status:'COMPLETED' },
        attributes:['invoice_id','amount_mga']
      })
    ]);
    const caseByInvoice = new Map();
    linkedCases.forEach(item => caseByInvoice.set(item.global_invoice_id, item.id));
    linkedDues.forEach(item => caseByInvoice.set(item.invoice_id, item.case_id));
    const paidByInvoice = new Map();
    payments.forEach(payment => paidByInvoice.set(
      payment.invoice_id, (paidByInvoice.get(payment.invoice_id) || 0) + Number(payment.amount_mga)
    ));
    res.json({ invoices:invoices.map(item => {
      const invoice = item.toJSON();
      const associatedCase = caseByInvoice.get(invoice.id);
      const paid = Number(paidByInvoice.get(invoice.id) || 0);
      return {
        ...invoice,
        paid_mga:paid,
        balance_mga:Math.max(0, Number(invoice.total_mga) - paid),
        odf_association: associatedCase
          ? (associatedCase === record.id ? 'CURRENT' : 'OTHER') : 'NONE'
      };
    }) });
  } catch (error) { res.status(500).json({ error:'Factures indisponibles' }); }
});

router.post('/:id/link-invoice', requirePermission('invoices','write'), async (req, res) => {
  if (!uuid(req.params.id) || !uuid(req.body?.invoice_id)) return res.status(400).json({ error:'Identifiants invalides' });
  if (req.body?.sequence !== undefined && (!Number.isInteger(Number(req.body.sequence)) || Number(req.body.sequence) < 0)) {
    return res.status(400).json({ error:'Numéro d’échéance invalide' });
  }
  try {
    const result = await sequelize.transaction(async transaction => {
      const clinic = clinicId(req);
      const record = await OrthodonticCase.findOne({ where:{id:req.params.id,clinic_id:clinic}, transaction, lock:transaction.LOCK.UPDATE });
      if (!record) return { code:404, error:'Dossier non trouvé' };
      const invoice = await Invoice.findOne({
        where: { id:req.body.invoice_id, clinic_id:clinic, patient_id:record.patient_id },
        transaction, lock:transaction.LOCK.UPDATE
      });
      if (!invoice || invoice.document_type !== 'INVOICE' || invoice.status === 'CANCELLED') {
        return { code:400, error:'Facture invalide pour ce traitement' };
      }
      const usedCase = await OrthodonticCase.findOne({ where:{ global_invoice_id:invoice.id }, transaction });
      const usedDue = await OrthodonticDue.findOne({ where:{ invoice_id:invoice.id }, transaction });
      if (usedCase || usedDue) return { code:409, error:'Cette facture est déjà associée à un dossier ODF' };
      if (record.billing_mode === 'FORFAIT') {
        if (record.global_invoice_id) return { code:409, error:'Une facture globale est déjà liée au forfait' };
        if (Number(invoice.total_mga) !== Number(record.total_mga)) return { code:400, error:'Le montant de la facture doit être égal au prix total du forfait' };
        await record.update({ global_invoice_id:invoice.id }, { transaction });
      } else {
        const due = await OrthodonticDue.findOne({ where:{ case_id:record.id, clinic_id:clinic, sequence:Number(req.body.sequence) }, transaction, lock:transaction.LOCK.UPDATE });
        if (!due) return { code:404, error:'Échéance introuvable' };
        if (due.invoice_id) return { code:409, error:'Cette échéance est déjà facturée' };
        if (Number(invoice.total_mga) !== Number(due.amount_mga)) return { code:400, error:'Le montant facturé doit correspondre à la mensualité' };
        await due.update({ invoice_id:invoice.id }, { transaction });
      }
      return { ok:true, invoice_id:invoice.id };
    });
    if (!result.ok) return res.status(result.code).json({ error:result.error });
    res.json(result);
  } catch (error) {
    const conflict = error?.name === 'SequelizeUniqueConstraintError';
    res.status(conflict ? 409 : 500).json({ error:conflict?'Facture déjà associée':'Rapprochement impossible' });
  }
});

module.exports = router;
