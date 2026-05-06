const express = require('express');
const request = require('supertest');
const { requireModuleAccess } = require('../utils/permissions');

const clinicA = '11111111-1111-4111-8111-111111111111';
const clinicB = '22222222-2222-4222-8222-222222222222';
const patientA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const patientB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const scheduleA = '33333333-3333-4333-8333-333333333333';

function buildApp(role = 'ADMIN', clinicId = clinicA) {
  jest.resetModules();

  const models = {
    Invoice: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 'invoice-id' }),
      findByPk: jest.fn().mockResolvedValue({ id: 'invoice-id', clinic_id: clinicId })
    },
    InvoiceItem: {
      create: jest.fn().mockResolvedValue({})
    },
    Patient: {
      findOne: jest.fn()
    },
    Payment: {
      findAll: jest.fn()
    },
    AuditLog: {
      create: jest.fn().mockResolvedValue({})
    },
    PricingSchedule: {
      findOne: jest.fn()
    },
    Clinic: {},
    User: {
      findOne: jest.fn()
    },
    sequelize: {
      transaction: jest.fn(async callback => callback('tx'))
    }
  };

  jest.doMock('../models', () => models);
  const invoiceRoutes = require('../routes/invoices');

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: '99999999-9999-4999-8999-999999999999', role, clinic_id: clinicId };
    req.clinic_id = clinicId;
    next();
  });
  app.use('/api/invoices', requireModuleAccess('invoices'), invoiceRoutes);

  return { app, models };
}

const validPayload = {
  patient_id: patientA,
  items: [
    { description: 'Consultation', quantity: 1, unit_price_mga: 35000 }
  ]
};

describe('invoice multi-tenant isolation', () => {
  afterEach(() => {
    jest.dontMock('../models');
  });

  test('blocks invoice creation when patient is not in the authenticated clinic', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);
    models.Patient.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/invoices')
      .send({ ...validPayload, patient_id: patientB });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Patient non trouvé');
    expect(models.Patient.findOne).toHaveBeenCalledWith({ where: { id: patientB, clinic_id: clinicA } });
    expect(models.sequelize.transaction).not.toHaveBeenCalled();
    expect(models.Invoice.create).not.toHaveBeenCalled();
  });

  test('blocks invoice creation when schedule is outside the authenticated clinic', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);
    models.Patient.findOne.mockResolvedValue({ id: patientA, clinic_id: clinicA });
    models.PricingSchedule.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/invoices')
      .send({ ...validPayload, schedule_id: scheduleA });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Grille tarifaire non trouvée');
    expect(models.PricingSchedule.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: scheduleA,
        is_active: true
      })
    });
    expect(models.sequelize.transaction).not.toHaveBeenCalled();
    expect(models.Invoice.create).not.toHaveBeenCalled();
  });

  test('allows invoice creation only after patient and schedule are scoped to the authenticated clinic', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);
    models.Patient.findOne.mockResolvedValue({ id: patientA, clinic_id: clinicA });
    models.PricingSchedule.findOne.mockResolvedValue({ id: scheduleA, clinic_id: clinicA, is_active: true });

    const res = await request(app)
      .post('/api/invoices')
      .send({ ...validPayload, schedule_id: scheduleA });

    expect(res.status).toBe(201);
    expect(models.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(models.Invoice.create).toHaveBeenCalledWith(expect.objectContaining({
      patient_id: patientA,
      clinic_id: clinicA,
      schedule_id: scheduleA
    }), { transaction: 'tx' });
    expect(models.InvoiceItem.create).toHaveBeenCalledWith(expect.objectContaining({
      invoice_id: 'invoice-id',
      description: 'Consultation'
    }), { transaction: 'tx' });
  });
});
