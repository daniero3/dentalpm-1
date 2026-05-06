const express = require('express');
const request = require('supertest');
const { requireModuleAccess } = require('../utils/permissions');

const clinicA = '11111111-1111-4111-8111-111111111111';
const clinicB = '22222222-2222-4222-8222-222222222222';
const patientA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const patientB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function buildApp(role = 'ADMIN', clinicId = clinicA) {
  jest.resetModules();

  const models = {
    Patient: {
      findOne: jest.fn(),
      create: jest.fn()
    },
    Treatment: {
      findAll: jest.fn().mockResolvedValue([])
    },
    Appointment: {},
    Invoice: {},
    AuditLog: {
      create: jest.fn().mockResolvedValue({})
    },
    User: {
      findByPk: jest.fn()
    },
    sequelize: {
      query: jest.fn()
    }
  };

  jest.doMock('../models', () => models);
  const patientRoutes = require('../routes/patients');

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: '99999999-9999-4999-8999-999999999999', role, clinic_id: clinicId };
    req.clinic_id = clinicId;
    next();
  });
  app.use('/api/patients', requireModuleAccess('patients'), patientRoutes);

  return { app, models };
}

describe('patient multi-tenant isolation', () => {
  afterEach(() => {
    jest.dontMock('../models');
  });

  test('scopes patient detail lookup to authenticated clinic', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);
    models.Patient.findOne.mockResolvedValue(null);

    const res = await request(app).get(`/api/patients/${patientB}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Patient non trouvé');
    expect(models.Patient.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: patientB, clinic_id: clinicA }
    }));
  });

  test('scopes patient update to authenticated clinic', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);
    models.Patient.findOne.mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/patients/${patientB}`)
      .send({ first_name: 'Jean' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Patient non trouvé');
    expect(models.Patient.findOne).toHaveBeenCalledWith({ where: { id: patientB, clinic_id: clinicA } });
  });

  test('scopes dental chart treatments to authenticated clinic after patient validation', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);
    models.Patient.findOne.mockResolvedValue({ id: patientA, clinic_id: clinicA });

    const res = await request(app).get(`/api/patients/${patientA}/dental-chart`);

    expect(res.status).toBe(200);
    expect(models.Patient.findOne).toHaveBeenCalledWith({ where: { id: patientA, clinic_id: clinicA } });
    expect(models.Treatment.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { patient_id: patientA, clinic_id: clinicA }
    }));
  });

  test('read-only accountant cannot update patients', async () => {
    const { app, models } = buildApp('ACCOUNTANT', clinicA);

    const res = await request(app)
      .put(`/api/patients/${patientA}`)
      .send({ first_name: 'Jean' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(models.Patient.findOne).not.toHaveBeenCalled();
  });

  test('admin patient creation ignores caller-supplied clinic_id and uses authenticated clinic', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);
    models.sequelize.query
      .mockResolvedValueOnce()
      .mockResolvedValueOnce([[{ current_value: 7 }]]);
    models.Patient.create.mockResolvedValue({ id: patientA, clinic_id: clinicA });

    const res = await request(app)
      .post('/api/patients')
      .send({
        first_name: 'Jean',
        last_name: 'Rakoto',
        date_of_birth: '1990-01-01',
        gender: 'M',
        phone_primary: '+261 34 12 345 67',
        clinic_id: clinicB
      });

    expect(res.status).toBe(201);
    expect(models.Patient.create).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: clinicA,
      patient_number: 'PAT-000007'
    }));
  });
});
