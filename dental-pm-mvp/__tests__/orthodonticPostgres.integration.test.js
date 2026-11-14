/**
 * Orthodontie — PostgreSQL de CI exclusivement.
 * Ce test refuse toute connexion à une base hors dentalpm_orthodontic_test.
 */
const enabled = process.env.DENTALPM_ODF_PG_TESTS === '1';
const describePg = enabled ? describe : describe.skip;
const clinicA = '33333333-3333-4333-8333-333333333333';
const clinicB = '44444444-4444-4444-8444-444444444444';
const userA = '99999999-9999-4999-8999-999999999999';
const patientA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const patientB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describePg('Orthodontie — PostgreSQL isolé', () => {
  let db, models, request, app;
  const postCase = (patient_id, total_mga=3600000) => ({
    patient_id, appliance_type:'FIXED', start_date:'2026-01-15',
    billing_mode:'FORFAIT', total_mga, upfront_mga:600000,
    months:12, first_due_date:'2026-01-15'
  });
  const headers = clinic => ({'x-odf-clinic':clinic});

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test' || process.env.CI !== 'true') throw new Error('Test autorisé uniquement dans CI');
    const url = new URL(process.env.DATABASE_URL || '');
    if (!['localhost','127.0.0.1','::1'].includes(url.hostname) ||
        url.pathname !== '/dentalpm_orthodontic_test' || url.username !== 'odf_test') {
      throw new Error('Base ODF non jetable : connexion refusée');
    }
    db = require('../database/connection');
    models = require('../models');
    await db.authenticate();
    const rows = await db.query('SELECT current_database() AS db', {type:db.QueryTypes.SELECT});
    if (rows[0].db !== 'dentalpm_orthodontic_test') throw new Error('Base incorrecte');
    await db.query('CREATE TABLE clinics (id UUID PRIMARY KEY)');
    await db.query('CREATE TABLE users (id UUID PRIMARY KEY)');
    await models.PricingSchedule.sync();
    await models.Patient.sync();
    await models.Invoice.sync();
    await models.Payment.sync();
    await models.Appointment.sync();
    const migrate = require('../migrations/20261113-orthodontics-mvp');
    await migrate.up(db.getQueryInterface());
    await migrate.up(db.getQueryInterface());

    const express = require('express');
    request = require('supertest');
    app = express();
    app.use(express.json());
    app.use((req,res,next) => {
      req.clinic_id = req.headers['x-odf-clinic'] || clinicA;
      req.user = { id:userA,role:'ADMIN',clinic_id:req.clinic_id };
      next();
    });
    app.use('/api/orthodontics',require('../routes/orthodontics'));
  }, 30000);

  beforeEach(async () => {
    await db.query('TRUNCATE orthodontic_visits, orthodontic_dues, orthodontic_cases, payments, invoices, patients, users, clinics CASCADE');
    await db.query('INSERT INTO clinics (id) VALUES ($1),($2)', {bind:[clinicA,clinicB]});
    await db.query('INSERT INTO users (id) VALUES ($1)', {bind:[userA]});
    await models.Patient.create({id:patientA,clinic_id:clinicA,created_by_user_id:userA,patient_number:'PAT-ODF-A',first_name:'Claire',last_name:'A',date_of_birth:'2000-04-01',gender:'F',phone_primary:'0340000000'});
    await models.Patient.create({id:patientB,clinic_id:clinicB,created_by_user_id:userA,patient_number:'PAT-ODF-B',first_name:'Jean',last_name:'B',date_of_birth:'2001-04-01',gender:'M',phone_primary:'0341111111'});
  });

  afterAll(async () => { if (db) await db.close(); });

  test('un cabinet ne peut créer ni consulter un dossier ODF d’un autre cabinet', async () => {
    const denied = await request(app).post('/api/orthodontics').set(headers(clinicB)).send(postCase(patientA));
    expect(denied.status).toBe(404);
    const created = await request(app).post('/api/orthodontics').set(headers(clinicA)).send(postCase(patientA));
    expect(created.status).toBe(201);
    const foreign = await request(app).get('/api/orthodontics/' + created.body.case_id).set(headers(clinicB));
    expect(foreign.status).toBe(404);
    const own = await request(app).get('/api/orthodontics/' + created.body.case_id).set(headers(clinicA));
    expect(own.status).toBe(200);
    expect(own.body.finance.dues).toHaveLength(13);
    expect(own.body.finance.totals.paid_mga).toBe(0);
  });

  test('une facture liée une seule fois, puis paiements partiels lus sans duplication', async () => {
    const first = await request(app).post('/api/orthodontics').set(headers(clinicA)).send(postCase(patientA));
    const second = await request(app).post('/api/orthodontics').set(headers(clinicA)).send(postCase(patientA));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const invoice = await models.Invoice.create({
      invoice_number:'ODF-CI-001', patient_id:patientA, clinic_id:clinicA,
      document_type:'INVOICE', total_mga:3600000, subtotal_mga:3600000
    });
    const endpoint = id => '/api/orthodontics/' + id + '/link-invoice';
    const linked = await request(app).post(endpoint(first.body.case_id))
      .set(headers(clinicA)).send({ invoice_id:invoice.id });
    expect(linked.status).toBe(200);
    const secondLink = await request(app).post(endpoint(second.body.case_id))
      .set(headers(clinicA)).send({ invoice_id:invoice.id });
    expect(secondLink.status).toBe(409);
    await models.Payment.create({
      invoice_id:invoice.id, clinic_id:clinicA, payment_number:'ODF-PAY-001',
      amount_mga:850000, payment_method:'CASH', status:'COMPLETED'
    });
    const result = await request(app).get('/api/orthodontics/' + first.body.case_id).set(headers(clinicA));
    expect(result.status).toBe(200);
    expect(result.body.finance.totals.paid_mga).toBe(850000);
    expect(result.body.finance.totals.balance_mga).toBe(2750000);
    expect(result.body.finance.dues[0].status).toBe('PAID');
    expect(result.body.finance.dues[1].status).toBe('PAID');
    expect(result.body.finance.dues[2].paid_mga).toBe(0);
  });

  test('retard cumulé = échéances contractuelles impayées, facturées ou non', async () => {
    // Use the first day of the month ten months before today, for a durable
    // test with eleven matured periods and one future period in any month.
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone:'Indian/Antananarivo', year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(new Date());
    const local = Object.fromEntries(parts.map(p => [p.type,p.value]));
    const first = new Date(Date.UTC(Number(local.year), Number(local.month) - 1 - 10, 1))
      .toISOString().slice(0, 10);

    const created = await request(app).post('/api/orthodontics')
      .set(headers(clinicA)).send({
        patient_id:patientA, appliance_type:'FIXED', start_date:first,
        billing_mode:'MONTHLY', monthly_mga:250000, months:12,
        first_due_date:first
      });
    expect(created.status).toBe(201);

    const invoice = await models.Invoice.create({
      invoice_number:'ODF-LATE-001', patient_id:patientA, clinic_id:clinicA,
      document_type:'INVOICE', total_mga:250000, subtotal_mga:250000
    });
    const linked = await request(app).post(
      '/api/orthodontics/' + created.body.case_id + '/link-invoice'
    ).set(headers(clinicA)).send({invoice_id:invoice.id,sequence:1});
    expect(linked.status).toBe(200);

    await models.Payment.create({
      invoice_id:invoice.id, clinic_id:clinicA, payment_number:'ODF-LATE-PAY-001',
      amount_mga:250000, payment_method:'CASH', status:'COMPLETED'
    });

    const response = await request(app).get(
      '/api/orthodontics/' + created.body.case_id
    ).set(headers(clinicA));
    expect(response.status).toBe(200);
    const financial = response.body.finance;

    // First of eleven matured periods was fully paid; ten are overdue.
    expect(financial.totals.billed_mga).toBe(250000);
    expect(financial.totals.paid_mga).toBe(250000);
    expect(financial.totals.balance_mga).toBe(0);
    expect(financial.totals.overdue_mga).toBe(2500000);
    expect(financial.totals.overdue_unbilled_mga).toBe(2500000);
    expect(financial.totals.unbilled_due_periods).toBe(10);
    expect(financial.dues[0].status).toBe('PAID');
    expect(financial.dues[1].status).toBe('UNBILLED');
    expect(financial.dues[1].is_overdue).toBe(true);
    expect(financial.dues[10].overdue_mga).toBe(250000);
    expect(financial.dues[11].overdue_mga).toBe(0);
  });

  test('deux factures du même patient restent visibles, mais seule la facture associée entre dans le solde ODF', async () => {
    const created = await request(app).post('/api/orthodontics').set(headers(clinicA)).send({
      patient_id:patientA, appliance_type:'FIXED', start_date:'2026-01-13',
      billing_mode:'MONTHLY', monthly_mga:250000, months:12,
      first_due_date:'2026-01-13'
    });
    expect(created.status).toBe(201);
    const linked = await models.Invoice.create({
      invoice_number:'ODF-VISIBLE-001', patient_id:patientA, clinic_id:clinicA,
      document_type:'INVOICE', total_mga:250000, subtotal_mga:250000, status:'PARTIAL'
    });
    const unlinked = await models.Invoice.create({
      invoice_number:'ODF-VISIBLE-002', patient_id:patientA, clinic_id:clinicA,
      document_type:'INVOICE', total_mga:250000, subtotal_mga:250000, status:'SENT'
    });
    // A different clinic's invoice must not be exposed.
    await models.Invoice.create({
      invoice_number:'ODF-VISIBLE-OTHER', patient_id:patientB, clinic_id:clinicB,
      document_type:'INVOICE', total_mga:950000, subtotal_mga:950000, status:'SENT'
    });
    await models.Payment.create({
      invoice_id:linked.id, clinic_id:clinicA, payment_number:'ODF-VISIBLE-PAY',
      amount_mga:100000, payment_method:'CASH', status:'COMPLETED'
    });
    const attached = await request(app)
      .post('/api/orthodontics/' + created.body.case_id + '/link-invoice')
      .set(headers(clinicA)).send({invoice_id:linked.id,sequence:1});
    expect(attached.status).toBe(200);

    const list = await request(app)
      .get('/api/orthodontics/' + created.body.case_id + '/invoices')
      .set(headers(clinicA));
    expect(list.status).toBe(200);
    expect(list.body.invoices).toHaveLength(2);
    const mapped = Object.fromEntries(list.body.invoices.map(item=>[item.id,item]));
    expect(mapped[linked.id].odf_association).toBe('CURRENT');
    expect(mapped[linked.id].paid_mga).toBe(100000);
    expect(mapped[linked.id].balance_mga).toBe(150000);
    expect(mapped[unlinked.id].odf_association).toBe('NONE');
    expect(mapped[unlinked.id].paid_mga).toBe(0);
    expect(mapped[unlinked.id].balance_mga).toBe(250000);

    const detail = await request(app)
      .get('/api/orthodontics/' + created.body.case_id).set(headers(clinicA));
    expect(detail.body.finance.totals.billed_mga).toBe(250000);
    expect(detail.body.finance.totals.paid_mga).toBe(100000);
    expect(detail.body.finance.totals.balance_mga).toBe(150000);
  });

  test('les honoraires mensuels exigent une facture distincte pour chaque période', async () => {
    const resp = await request(app).post('/api/orthodontics').set(headers(clinicA)).send({
      patient_id:patientA,appliance_type:'ALIGNERS',start_date:'2026-01-31',
      billing_mode:'MONTHLY',monthly_mga:180000,months:3,first_due_date:'2026-01-31'
    });
    expect(resp.status).toBe(201);
    const invoice = await models.Invoice.create({
      invoice_number:'ODF-M-001', patient_id:patientA, clinic_id:clinicA,
      document_type:'INVOICE', total_mga:180000, subtotal_mga:180000
    });
    const url = '/api/orthodontics/' + resp.body.case_id + '/link-invoice';
    expect((await request(app).post(url).set(headers(clinicA)).send({invoice_id:invoice.id,sequence:1})).status).toBe(200);
    expect((await request(app).post(url).set(headers(clinicA)).send({invoice_id:invoice.id,sequence:2})).status).toBe(409);
    const result = await request(app).get('/api/orthodontics/' + resp.body.case_id).set(headers(clinicA));
    expect(result.body.finance.dues[0].invoice_id).toBe(invoice.id);
    expect(result.body.finance.dues[1].status).toBe('UNBILLED');
  });
});
