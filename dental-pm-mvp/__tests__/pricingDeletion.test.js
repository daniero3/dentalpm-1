const express = require('express');
const request = require('supertest');

const clinicId = '11111111-1111-4111-8111-111111111111';
const scheduleId = '33333333-3333-4333-8333-333333333333';

function buildApp(modelsOverrides = {}) {
  jest.resetModules();

  const models = {
    PricingSchedule: {
      findOne: jest.fn(),
      findOrCreate: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn()
    },
    ProcedureFee: {
      count: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      destroy: jest.fn(),
      update: jest.fn()
    },
    ...modelsOverrides
  };

  jest.doMock('../models', () => models);
  const pricingRoutes = require('../routes/pricing');

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: '99999999-9999-4999-8999-999999999999', role: 'ADMIN', clinic_id: clinicId };
    req.clinic_id = clinicId;
    next();
  });
  app.use('/api/pricing-schedules', pricingRoutes);

  return { app, models };
}

describe('pricing deletion persistence', () => {
  afterEach(() => {
    jest.dontMock('../models');
  });

  test('does not recreate default fees for an existing empty cabinet schedule', async () => {
    const cabinetSchedule = {
      id: scheduleId,
      clinic_id: clinicId,
      type: 'CABINET',
      is_active: true,
      toJSON() {
        return { id: this.id, clinic_id: this.clinic_id, type: this.type, is_active: this.is_active };
      }
    };
    const globalSyndical = { id: '44444444-4444-4444-8444-444444444444', clinic_id: null, type: 'SYNDICAL', is_active: true };
    const { app, models } = buildApp();

    models.PricingSchedule.findOne.mockResolvedValue(globalSyndical);
    models.PricingSchedule.findOrCreate.mockResolvedValue([cabinetSchedule, false]);
    models.PricingSchedule.findAll.mockResolvedValue([cabinetSchedule]);

    const res = await request(app).get('/api/pricing-schedules');

    expect(res.status).toBe(200);
    expect(models.ProcedureFee.count).not.toHaveBeenCalled();
    expect(models.ProcedureFee.create).not.toHaveBeenCalled();
  });

  test('import replace deletes existing fees absent from the imported file', async () => {
    const cabinetSchedule = { id: scheduleId, clinic_id: clinicId, type: 'CABINET', is_active: true };
    const { app, models } = buildApp();

    models.PricingSchedule.findOne.mockResolvedValue(cabinetSchedule);
    models.ProcedureFee.findOne.mockResolvedValue(null);
    models.ProcedureFee.create.mockResolvedValue({});
    models.ProcedureFee.destroy.mockResolvedValue(3);

    const res = await request(app)
      .post(`/api/pricing-schedules/${scheduleId}/import-fees`)
      .field('replace', 'true')
      .attach('file', Buffer.from('procedure_code,label,price_mga,category\nCONS01,Consultation,35000,GENERAL\n'), 'fees.csv');

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(3);
    expect(models.ProcedureFee.destroy).toHaveBeenCalledWith({
      where: expect.objectContaining({
        schedule_id: scheduleId
      })
    });
    const destroyWhere = models.ProcedureFee.destroy.mock.calls[0][0].where;
    const opKeys = Object.getOwnPropertySymbols(destroyWhere.procedure_code);
    expect(opKeys).toHaveLength(1);
    expect(destroyWhere.procedure_code[opKeys[0]]).toEqual(['CONS01']);
  });
});
