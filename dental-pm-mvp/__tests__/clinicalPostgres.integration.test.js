/**
 * P0.7 — Intégration PostgreSQL avec données exclusivement synthétiques.
 * Exécution autorisée uniquement sur la base jetable dentalpm_clinical_test,
 * accessible via localhost, lorsque DENTALPM_PG_TESTS=1.
 */
const express = require('express');
const request = require('supertest');

const enabled = process.env.DENTALPM_PG_TESTS === '1';
const describePg = enabled ? describe : describe.skip;

const clinicA = '11111111-1111-4111-8111-111111111111';
const clinicB = '22222222-2222-4222-8222-222222222222';
const patientA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const patientB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userA = '99999999-9999-4999-8999-999999999999';

const act = (name) => ({
  procedure_type: 'restoration',
  procedure_name: name,
  description: '',
  cost_mga: 45000,
  date_performed: '2026-11-10',
  notes: ''
});

describePg('P0.7 — PostgreSQL réel, environnement jetable', () => {
  let sequelize;
  let models;
  let app;

  const chartUrl = '/api/patients/' + patientA + '/dental-chart';
  const toothUrl = chartUrl + '/tooth/8';
  const odontogramUrl = '/api/patients/' + patientA + '/odontogram';

  async function rows(sql) {
    return sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
  }

  async function count(table) {
    const result = await rows('SELECT COUNT(*)::int AS total FROM ' + table);
    return result[0].total;
  }

  beforeAll(async () => {
    // Interdire toute connexion ou modification de la production,
    // même si une variable DATABASE_URL est présente par erreur.
    if (process.env.NODE_ENV !== 'test' || process.env.CI !== 'true') {
      throw new Error('Tests PostgreSQL autorisés uniquement dans GitHub Actions.');
    }
    const value = process.env.DATABASE_URL;
    if (!value) throw new Error('DATABASE_URL de test manquante.');
    const url = new URL(value);
    if (
      !['localhost', '127.0.0.1', '::1'].includes(url.hostname) ||
      url.pathname !== '/dentalpm_clinical_test' ||
      url.username !== 'clinical_test'
    ) {
      throw new Error('Connexion refusée : seule la base PostgreSQL CI jetable est autorisée.');
    }

    sequelize = require('../database/connection');
    models = require('../models');
    await sequelize.authenticate();

    const db = await rows('SELECT current_database() AS name');
    if (db[0].name !== 'dentalpm_clinical_test') {
      throw new Error('Nom de base incorrect : arrêt avant création de tables.');
    }

    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await sequelize.query('CREATE TABLE clinics (id UUID PRIMARY KEY)');
    await sequelize.query('CREATE TABLE users (id UUID PRIMARY KEY)');
    await models.Patient.sync({ force: true });
    await models.ToothStatus.sync({ force: true });
    await models.ToothHistory.sync({ force: true });
    await models.AuditLog.sync({ force: true });
    await sequelize.query(
      'CREATE UNIQUE INDEX tooth_statuses_patient_clinic_fdi_uniq ON tooth_statuses(patient_id, clinic_id, tooth_fdi)'
    );
    await sequelize.query(
      'CREATE TABLE dental_charts (' +
      'id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), ' +
      'patient_id UUID NOT NULL REFERENCES patients(id), ' +
      'clinic_id UUID NOT NULL REFERENCES clinics(id), ' +
      'teeth_records JSONB NOT NULL, ' +
      'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ' +
      'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ' +
      'UNIQUE(patient_id, clinic_id))'
    );

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.clinic_id = req.headers['x-test-clinic'] || clinicA;
      req.user = { id: userA, clinic_id: req.clinic_id };
      next();
    });
    app.use('/api', require('../routes/dental-chart'));
    app.use('/api', require('../routes/odontogram'));
  }, 30000);

  beforeEach(async () => {
    await sequelize.query('DROP TRIGGER IF EXISTS reject_chart_update ON dental_charts');
    await sequelize.query('DROP TRIGGER IF EXISTS reject_tooth_insert ON tooth_statuses');
    await sequelize.query(
      'TRUNCATE TABLE tooth_histories, tooth_statuses, audit_logs, dental_charts, patients, users, clinics CASCADE'
    );
    await sequelize.query('INSERT INTO clinics (id) VALUES ($1), ($2)', {
      bind: [clinicA, clinicB]
    });
    await sequelize.query('INSERT INTO users (id) VALUES ($1)', {
      bind: [userA]
    });
    await sequelize.query(
      'INSERT INTO patients (id, first_name, last_name, created_by_user_id, clinic_id, created_at, updated_at) ' +
      'VALUES ($1, $2, $3, $4, $5, NOW(), NOW()), ($6, $7, $8, $4, $9, NOW(), NOW())',
      { bind: [patientA, 'Patient', 'A', userA, clinicA, patientB, 'Patient', 'B', clinicB] }
    );
  });

  afterAll(async () => {
    if (sequelize) await sequelize.close();
  });

  test('Fiche dentaire : ajout persistant après lecture et statut non évalué conservé', async () => {
    const saved = await request(app).put(toothUrl).send({ procedures: [act('Obturation 11')] });
    expect(saved.status).toBe(200);
    const reloaded = await request(app).get(chartUrl);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.teeth_records[7].procedures).toHaveLength(1);
    expect(reloaded.body.teeth_records[7].status).toBeNull();
    expect(await count('dental_charts')).toBe(1);
  });

  test('Fiche dentaire : deux ajouts concurrents ne s écrasent pas', async () => {
    const [first, second] = await Promise.all([
      request(app).put(toothUrl).send({ procedures: [act('Acte A')] }),
      request(app).put(toothUrl).send({ procedures: [act('Acte B')] })
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const reloaded = await request(app).get(chartUrl);
    expect(reloaded.body.teeth_records[7].procedures).toHaveLength(1);
  });

  test('Fiche dentaire : erreur PostgreSQL annule la modification', async () => {
    expect((await request(app).put(toothUrl).send({
      procedures: [act('Acte initial')]
    })).status).toBe(200);

    await sequelize.query(
      "CREATE OR REPLACE FUNCTION test_reject_chart_update() RETURNS trigger " +
      "LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected chart failure'; END; $$"
    );
    await sequelize.query(
      'CREATE TRIGGER reject_chart_update BEFORE UPDATE ON dental_charts ' +
      'FOR EACH ROW EXECUTE FUNCTION test_reject_chart_update()'
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await request(app).put(toothUrl).send({
        procedures: [act('Acte initial'), act('Acte non enregistré')]
      });
      expect(result.status).toBe(500);
    } finally {
      consoleSpy.mockRestore();
    }

    const reloaded = await request(app).get(chartUrl);
    expect(reloaded.body.teeth_records[7].procedures).toHaveLength(1);
    expect(reloaded.body.teeth_records[7].procedures[0].procedure_name).toBe('Acte initial');
  });

  test('Odontogramme : deux dents, historique et audit validés ensemble', async () => {
    const res = await request(app).put(odontogramUrl).send({
      teeth: [
        { tooth_fdi: '11', status: 'CARIES' },
        { tooth_fdi: '12', status: 'FILLED' }
      ]
    });
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual({ created: 2, updated: 0, skipped: 0 });
    expect(await count('tooth_statuses')).toBe(2);
    expect(await count('tooth_histories')).toBe(2);
    expect(await count('audit_logs')).toBe(1);
  });

  test('Odontogramme : erreur sur seconde dent annule aussi première dent, historique et audit', async () => {
    await sequelize.query(
      "CREATE OR REPLACE FUNCTION test_reject_tooth_insert() RETURNS trigger " +
      "LANGUAGE plpgsql AS $$ BEGIN IF NEW.tooth_fdi = '12' THEN " +
      "RAISE EXCEPTION 'injected tooth failure'; END IF; RETURN NEW; END; $$"
    );
    await sequelize.query(
      'CREATE TRIGGER reject_tooth_insert BEFORE INSERT ON tooth_statuses ' +
      'FOR EACH ROW EXECUTE FUNCTION test_reject_tooth_insert()'
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await request(app).put(odontogramUrl).send({
        teeth: [
          { tooth_fdi: '11', status: 'CARIES' },
          { tooth_fdi: '12', status: 'FILLED' }
        ]
      });
      expect(res.status).toBe(500);
    } finally {
      consoleSpy.mockRestore();
    }

    expect(await count('tooth_statuses')).toBe(0);
    expect(await count('tooth_histories')).toBe(0);
    expect(await count('audit_logs')).toBe(0);
  });

  test('Isolation : cabinet B ne peut pas lire ni modifier le dossier du cabinet A', async () => {
    const header = { 'x-test-clinic': clinicB };
    const chart = await request(app).get(chartUrl).set(header);
    const odonto = await request(app).get(odontogramUrl).set(header);
    const history = await request(app).get(odontogramUrl + '/history').set(header);
    const postHistory = await request(app)
      .post(odontogramUrl + '/history')
      .set(header)
      .send({ tooth_fdi: '11', action: 'UPDATE', status: 'CARIES' });
    const update = await request(app)
      .put(odontogramUrl)
      .set(header)
      .send({ teeth: [{ tooth_fdi: '11', status: 'CARIES' }] });

    expect([chart.status, odonto.status, history.status, postHistory.status, update.status])
      .toEqual([404, 404, 404, 404, 404]);
    expect(await count('tooth_statuses')).toBe(0);
    expect(await count('tooth_histories')).toBe(0);
  });
});