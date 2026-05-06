const express = require('express');
const request = require('supertest');
const { requireModuleAccess } = require('../utils/permissions');

const clinicA = '11111111-1111-4111-8111-111111111111';
const clinicB = '22222222-2222-4222-8222-222222222222';
const patientA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const dentistA = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function buildApp(role = 'ADMIN', clinicId = clinicA) {
  jest.resetModules();

  const transaction = {
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue()
  };

  const models = {
    Patient: {
      findOne: jest.fn()
    },
    Appointment: {
      findOne: jest.fn(),
      create: jest.fn()
    },
    User: {
      findOne: jest.fn()
    },
    AuditLog: {
      create: jest.fn().mockResolvedValue({})
    },
    sequelize: {
      transaction: jest.fn().mockResolvedValue(transaction)
    }
  };

  jest.doMock('../models', () => models);
  const appointmentRoutes = require('../routes/appointments');

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: dentistA, role, clinic_id: clinicId };
    req.clinic_id = clinicId;
    next();
  });
  app.use('/api/appointments', requireModuleAccess('appointments'), appointmentRoutes);

  return { app, models, transaction };
}

describe('appointment CSV import', () => {
  afterEach(() => {
    jest.dontMock('../models');
  });

  test('imports a new appointment for an existing patient', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);

    models.Patient.findOne.mockResolvedValue({ id: patientA, clinic_id: clinicA });
    models.User.findOne.mockResolvedValue({ id: dentistA, clinic_id: clinicA });
    models.Appointment.findOne.mockResolvedValue(null);
    models.Appointment.create.mockResolvedValue({ id: 'appt-1' });

    const csvContent = [
      'patient_number,appointment_date,start_time,end_time,appointment_type,status,reason,notes,chair_number,dentist_email',
      'PAT-000001,2026-05-06,09:00,09:30,CONSULTATION,SCHEDULED,Contrôle,Première ligne,1,dr@example.com'
    ].join('\n');

    const res = await request(app)
      .post('/api/appointments/import-csv')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'appointments.csv');

    expect(res.status).toBe(200);
    expect(res.body.inserted).toBe(1);
    expect(res.body.updated).toBe(0);
    expect(res.body.skipped).toBe(0);
    expect(models.Appointment.create).toHaveBeenCalledWith(expect.objectContaining({
      patient_id: patientA,
      clinic_id: clinicA,
      appointment_date: '2026-05-06',
      start_time: '09:00:00',
      end_time: '09:30:00',
      appointment_type: 'CONSULTATION',
      status: 'SCHEDULED',
      reason: 'Contrôle',
      notes: 'Première ligne',
      chair_number: '1'
    }), expect.objectContaining({ transaction: expect.any(Object) }));
  });

  test('updates an existing appointment when the same slot already exists', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);
    const existing = { update: jest.fn().mockResolvedValue({}) };

    models.Patient.findOne.mockResolvedValue({ id: patientA, clinic_id: clinicA });
    models.User.findOne.mockResolvedValue({ id: dentistA, clinic_id: clinicA });
    models.Appointment.findOne.mockResolvedValue(existing);

    const csvContent = [
      'patient_number,appointment_date,start_time,end_time,appointment_type,status,reason',
      'PAT-000001,2026-05-06,09:00,09:30,TREATMENT,CONFIRMED,Traitement'
    ].join('\n');

    const res = await request(app)
      .post('/api/appointments/import-csv')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'appointments.csv');

    expect(res.status).toBe(200);
    expect(res.body.inserted).toBe(0);
    expect(res.body.updated).toBe(1);
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({
      appointment_type: 'TREATMENT',
      status: 'CONFIRMED',
      confirmed_by_patient: true
    }), expect.objectContaining({ transaction: expect.any(Object) }));
  });

  test('skips rows when the patient cannot be resolved inside the cabinet', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);

    models.Patient.findOne.mockResolvedValue(null);

    const csvContent = [
      'patient_number,appointment_date,start_time,end_time',
      'PAT-999999,2026-05-06,09:00,09:30'
    ].join('\n');

    const res = await request(app)
      .post('/api/appointments/import-csv')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'appointments.csv');

    expect(res.status).toBe(200);
    expect(res.body.inserted).toBe(0);
    expect(res.body.updated).toBe(0);
    expect(res.body.skipped).toBe(1);
    expect(res.body.errors[0].error).toContain('Patient introuvable');
    expect(models.Appointment.create).not.toHaveBeenCalled();
  });
});
