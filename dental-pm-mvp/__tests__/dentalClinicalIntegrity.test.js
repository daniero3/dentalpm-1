/**
 * DentalPM - P0.7. Tests de routes avec dépendances simulées.
 * Ne se connecte PAS à PostgreSQL et ne remplace PAS les tests d'intégration réels.
 * Branch: fix/p0-6a-dental-chart-transactions
 * Target: dental-pm-mvp/__tests__/dentalClinicalIntegrity.test.js
 */
const express = require('express');
const request = require('supertest');

const clinicA = '11111111-1111-4111-8111-111111111111';
const patientA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userA = '99999999-9999-4999-8999-999999999999';
const procedureA = {
  procedure_type: 'restoration',
  procedure_name: 'Obturation 11',
  description: '', cost_mga: 45000, date_performed: '2026-11-09', notes: ''
};

function makeApp(router, clinicId = clinicA) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.clinic_id = clinicId;
    req.user = { id: userA, clinic_id: clinicId };
    next();
  });
  app.use('/api', router);
  return app;
}

function setupChart({ patientExists = true, clinicId = clinicA, chartExists = true } = {}) {
  jest.resetModules();

  const initialRecords = Array.from({ length: 32 }, (_, i) => ({
    tooth_position: String(i + 1), status: null, procedures: [], notes: ''
  }));
  let storedChart = chartExists
    ? { id: 'chart-1', teeth_records: initialRecords }
    : null;
  const events = [];
  const tx = { label: 'fake-transaction' };

  const sequelize = {
    query: jest.fn(async (sql, options = {}) => {
      if (/^SELECT id FROM patients/.test(sql)) {
        return patientExists ? [{ id: patientA }] : [];
      }
      if (/^SELECT id, teeth_records FROM dental_charts/.test(sql)) {
        return storedChart ? [storedChart] : [];
      }
      if (/^UPDATE dental_charts/.test(sql)) {
        storedChart = {
          ...storedChart,
          teeth_records: JSON.parse(options.bind[0])
        };
        events.push('write');
        return [1];
      }
      if (/^INSERT INTO dental_charts/.test(sql.trim())) {
        storedChart = { id: 'chart-1', teeth_records: JSON.parse(options.bind[2]) };
        events.push('insert');
        return [1];
      }
      throw new Error('Unexpected SQL: ' + sql);
    }),
    transaction: jest.fn(async callback => {
      try {
        const result = await callback(tx);
        events.push('commit');
        return result;
      } catch (error) {
        events.push('rollback-requested');
        throw error;
      }
    })
  };

  jest.doMock('../database/connection', () => sequelize);
  const router = require('../routes/dental-chart');
  return {
    app: makeApp(router, clinicId), sequelize, events,
    getChart: () => storedChart
  };
}

function setupOdontogram({ patientExists = true, clinicId = clinicA } = {}) {
  jest.resetModules();
  const events = [];
  const tx = { LOCK: { UPDATE: 'UPDATE' } };
  const sequelize = {
    transaction: jest.fn(async callback => {
      try {
        const result = await callback(tx);
        events.push('commit');
        return result;
      } catch (error) {
        events.push('rollback-requested');
        throw error;
      }
    })
  };
  const models = {
    Patient: {
      findOne: jest.fn().mockResolvedValue(patientExists ? { id: patientA } : null)
    },
    ToothStatus: {
      findOrCreate: jest.fn(async ({ defaults }) => [{
        ...defaults,
        update: jest.fn().mockResolvedValue()
      }, true]),
      findAll: jest.fn().mockResolvedValue([])
    },
    ToothHistory: {
      create: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue([])
    },
    AuditLog: { create: jest.fn().mockResolvedValue({}) },
    User: {}
  };
  jest.doMock('../database/connection', () => sequelize);
  jest.doMock('../models', () => models);
  const router = require('../routes/odontogram');
  return { app: makeApp(router, clinicId), sequelize, models, events, tx };
}

const chartUrl = `/api/patients/${patientA}/dental-chart`;
const chartToothUrl = `${chartUrl}/tooth/8`; // position 8 = FDI 11
const odontogramUrl = `/api/patients/${patientA}/odontogram`;

describe('P0.7 - Fiche dentaire : procédures et isolation', () => {
  afterEach(() => {
    jest.dontMock('../database/connection');
    jest.dontMock('../models');
    jest.restoreAllMocks();
  });

  test('GET sans fiche retourne des dents non évaluées, sans écriture', async () => {
    const { app, sequelize } = setupChart({ chartExists: false });
    const response = await request(app).get(chartUrl);
    expect(response.status).toBe(200);
    expect(response.body.teeth_records).toHaveLength(32);
    expect(response.body.teeth_records[7].status).toBeNull();
    expect(sequelize.query.mock.calls.some(([sql]) => /INSERT|UPDATE/.test(sql))).toBe(false);
  });

  test('refuse un cabinet non identifié', async () => {
    const { app, sequelize } = setupChart({ clinicId: null });
    const response = await request(app).get(chartUrl);
    expect(response.status).toBe(403);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  test('refuse la consultation et la modification si le patient n’appartient pas au cabinet', async () => {
    const { app, sequelize } = setupChart({ patientExists: false });
    expect((await request(app).get(chartUrl)).status).toBe(404);
    const response = await request(app).put(chartToothUrl).send({ procedures: [procedureA] });
    expect(response.status).toBe(404);
    expect(sequelize.query.mock.calls.some(([sql]) => /UPDATE dental_charts/.test(sql))).toBe(false);
  });

  test('ajoute un acte sans modifier le statut clinique', async () => {
    const { app, getChart, events } = setupChart();
    const response = await request(app).put(chartToothUrl).send({ procedures: [procedureA] });
    expect(response.status).toBe(200);
    expect(response.body.tooth.procedures).toHaveLength(1);
    expect(getChart().teeth_records[7].status).toBeNull();
    expect(events).toContain('commit');
    const reloaded = await request(app).get(chartUrl);
    expect(reloaded.body.teeth_records[7].procedures[0].procedure_name).toBe('Obturation 11');
  });

  test('refuse un ajout fondé sur une liste périmée (409)', async () => {
    const { app, sequelize, events } = setupChart();
    const first = await request(app).put(chartToothUrl).send({ procedures: [procedureA] });
    expect(first.status).toBe(200);
    const second = await request(app).put(chartToothUrl).send({ procedures: [procedureA] });
    expect(second.status).toBe(409);
    expect(events).toContain('rollback-requested');
    const updates = sequelize.query.mock.calls.filter(([sql]) => /^UPDATE dental_charts/.test(sql));
    expect(updates).toHaveLength(1);
  });

  test('refuse les champs non autorisés et les dates impossibles', async () => {
    const { app, sequelize } = setupChart();
    const altered = await request(app).put(chartToothUrl)
      .send({ procedures: [procedureA], status: 'HEALTHY' });
    expect(altered.status).toBe(400);
    const invalidDate = await request(app).put(chartToothUrl)
      .send({ procedures: [{ ...procedureA, date_performed: '2026-02-30' }] });
    expect(invalidDate.status).toBe(400);
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });
});

describe('P0.7 - Odontogramme : validation et transaction', () => {
  afterEach(() => {
    jest.dontMock('../database/connection');
    jest.dontMock('../models');
    jest.restoreAllMocks();
  });

  test('refuse un cabinet non identifié avant transaction', async () => {
    const { app, sequelize } = setupOdontogram({ clinicId: null });
    const response = await request(app).put(odontogramUrl)
      .send({ teeth: [{ tooth_fdi: '11', status: 'CARIES' }] });
    expect(response.status).toBe(403);
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  test('rejette une dent invalide sans aucune écriture', async () => {
    const { app, sequelize, models } = setupOdontogram();
    const response = await request(app).put(odontogramUrl).send({ teeth: [
      { tooth_fdi: '11', status: 'CARIES' },
      { tooth_fdi: '12', status: 'INVALID' }
    ] });
    expect(response.status).toBe(400);
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(models.ToothStatus.findOrCreate).not.toHaveBeenCalled();
  });

  test('refuse la même dent deux fois', async () => {
    const { app, sequelize } = setupOdontogram();
    const response = await request(app).put(odontogramUrl).send({ teeth: [
      { tooth_fdi: '11', status: 'CARIES' },
      { tooth_fdi: '11', status: 'HEALTHY' }
    ] });
    expect(response.status).toBe(400);
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  test('refuse un patient inaccessible avant toute écriture dentaire', async () => {
    const { app, models, events } = setupOdontogram({ patientExists: false });
    const response = await request(app).put(odontogramUrl)
      .send({ teeth: [{ tooth_fdi: '11', status: 'CARIES' }] });
    expect(response.status).toBe(404);
    expect(models.ToothStatus.findOrCreate).not.toHaveBeenCalled();
    expect(events).toContain('rollback-requested');
  });

  test('sauvegarde deux dents, deux historiques et l’audit dans la même transaction', async () => {
    const { app, models, sequelize, tx, events } = setupOdontogram();
    const response = await request(app).put(odontogramUrl).send({ teeth: [
      { tooth_fdi: '11', status: 'CARIES' },
      { tooth_fdi: '12', status: 'FILLED' }
    ] });
    expect(response.status).toBe(200);
    expect(response.body.results).toEqual({ created: 2, updated: 0, skipped: 0 });
    expect(models.ToothHistory.create).toHaveBeenCalledTimes(2);
    for (const [, options] of models.ToothHistory.create.mock.calls) {
      expect(options.transaction).toBe(tx);
    }
    expect(models.AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ clinic_id: clinicA }),
      expect.objectContaining({ transaction: tx })
    );
    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(events).toContain('commit');
  });

  test('si l’historique échoue, la route échoue et demande l’annulation de la transaction', async () => {
    const { app, models, events } = setupOdontogram();
    models.ToothHistory.create.mockRejectedValueOnce(new Error('failure injected'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const response = await request(app).put(odontogramUrl)
      .send({ teeth: [{ tooth_fdi: '11', status: 'CARIES' }] });
    expect(response.status).toBe(500);
    expect(events).toContain('rollback-requested');
    expect(models.AuditLog.create).not.toHaveBeenCalled();
    log.mockRestore();
  });

  test('si la deuxième dent échoue, aucun succès partiel n’est retourné', async () => {
    const { app, models, events } = setupOdontogram();
    models.ToothStatus.findOrCreate
      .mockImplementationOnce(async ({ defaults }) => [{ ...defaults }, true])
      .mockRejectedValueOnce(new Error('failure injected'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const response = await request(app).put(odontogramUrl).send({ teeth: [
      { tooth_fdi: '11', status: 'CARIES' },
      { tooth_fdi: '12', status: 'FILLED' }
    ] });
    expect(response.status).toBe(500);
    expect(events).toContain('rollback-requested');
    expect(models.ToothHistory.create).toHaveBeenCalledTimes(1);
    expect(models.AuditLog.create).not.toHaveBeenCalled();
    log.mockRestore();
  });
  
  test('GET odontogramme : refuse un cabinet absent', async () => {
    const { app, models } = setupOdontogram({ clinicId: null });

    const res = await request(app).get(odontogramUrl);

    expect(res.status).toBe(403);
    expect(models.Patient.findOne).not.toHaveBeenCalled();
    expect(models.ToothStatus.findAll).not.toHaveBeenCalled();
  });

  test('GET odontogramme : refuse un patient étranger', async () => {
    const { app, models } = setupOdontogram({
      patientExists: false
    });

    const res = await request(app).get(odontogramUrl);

    expect(res.status).toBe(404);
    expect(models.ToothStatus.findAll).not.toHaveBeenCalled();
  });

  test('GET historique : refuse un cabinet absent', async () => {
    const { app, models } = setupOdontogram({ clinicId: null });

    const res = await request(app).get(`${odontogramUrl}/history`);

    expect(res.status).toBe(403);
    expect(models.ToothHistory.findAll).not.toHaveBeenCalled();
  });

  test('GET historique : refuse un patient étranger', async () => {
    const { app, models } = setupOdontogram({
      patientExists: false
    });

    const res = await request(app).get(`${odontogramUrl}/history`);

    expect(res.status).toBe(404);
    expect(models.ToothHistory.findAll).not.toHaveBeenCalled();
  });

  test('POST historique : refuse un cabinet absent', async () => {
    const { app, models } = setupOdontogram({ clinicId: null });

    const res = await request(app)
      .post(`${odontogramUrl}/history`)
      .send({
        tooth_fdi: '11',
        action: 'UPDATE',
        status: 'CARIES'
      });

    expect(res.status).toBe(403);
    expect(models.ToothHistory.create).not.toHaveBeenCalled();
  });

  test('POST historique : refuse un patient étranger', async () => {
    const { app, models } = setupOdontogram({
      patientExists: false
    });

    const res = await request(app)
      .post(`${odontogramUrl}/history`)
      .send({
        tooth_fdi: '11',
        action: 'UPDATE',
        status: 'CARIES'
      });

    expect(res.status).toBe(404);
    expect(models.ToothHistory.create).not.toHaveBeenCalled();
  });
});
