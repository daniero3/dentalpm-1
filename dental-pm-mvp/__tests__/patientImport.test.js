const express = require('express');
const request = require('supertest');
const { requireModuleAccess } = require('../utils/permissions');

const clinicA = '11111111-1111-4111-8111-111111111111';
const clinicB = '22222222-2222-4222-8222-222222222222';

function buildApp(role = 'ADMIN', clinicId = clinicA) {
  jest.resetModules();

  const models = {
    Patient: {
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'new-patient-id' })
    },
    Treatment: {},
    Appointment: {},
    Invoice: {},
    AuditLog: {
      create: jest.fn().mockResolvedValue({})
    },
    User: {
      findByPk: jest.fn()
    },
    sequelize: {
      transaction: jest.fn(async callback => callback('tx'))
    }
  };

  jest.doMock('../models', () => models);
  const patientsRoutes = require('../routes/patients');

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: '99999999-9999-4999-8999-999999999999', role, clinic_id: clinicId };
    req.clinic_id = clinicId;
    next();
  });
  app.use('/api/patients', requireModuleAccess('patients'), patientsRoutes);

  return { app, models };
}

describe('patient CSV import', () => {
  afterEach(() => {
    jest.dontMock('../models');
  });

  test('imports patients for the authenticated clinic and updates existing matches only within that clinic', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);
    const existing = {
      id: 'existing-patient-id',
      update: jest.fn().mockResolvedValue({})
    };

    models.Patient.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null);

    const csvContent = [
      'patient_number,first_name,last_name,date_of_birth,gender,phone_primary,email',
      'PAT-OLD-001,Jean,Rakoto,1990-05-12,M,0341111111,jean@example.com',
      'PAT-NEW-002,Marie,Ranaivo,1992-02-10,F,0342222222,marie@example.com'
    ].join('\n');

    const res = await request(app)
      .post('/api/patients/import-csv')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'patients.csv');

    expect(res.status).toBe(200);
    expect(res.body.inserted).toBe(1);
    expect(res.body.updated).toBe(1);
    expect(res.body.skipped).toBe(0);
    expect(models.Patient.findOne).toHaveBeenNthCalledWith(1, {
      where: { clinic_id: clinicA, patient_number: 'PAT-OLD-001' },
      transaction: 'tx'
    });
    expect(models.Patient.findOne).toHaveBeenNthCalledWith(2, {
      where: { clinic_id: clinicA, patient_number: 'PAT-NEW-002' },
      transaction: 'tx'
    });
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: clinicA,
      first_name: 'Jean',
      last_name: 'Rakoto'
    }), { transaction: 'tx' });
    expect(models.Patient.create).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: clinicA,
      patient_number: 'PAT-NEW-002',
      first_name: 'Marie',
      last_name: 'Ranaivo'
    }), { transaction: 'tx' });
    expect(models.sequelize.transaction).toHaveBeenCalledTimes(1);
  });

  test('blocks import when no CSV file is attached', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);

    const res = await request(app)
      .post('/api/patients/import-csv');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Fichier CSV requis');
    expect(models.sequelize.transaction).not.toHaveBeenCalled();
    expect(models.Patient.create).not.toHaveBeenCalled();
  });

  test('does not allow clinic B data to leak into clinic A import scope', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);

    models.Patient.findOne.mockResolvedValueOnce(null);

    const csvContent = [
      'patient_number,first_name,last_name,date_of_birth,gender,phone_primary,email',
      'PAT-NEW-999,Luc,Other,1988-03-02,M,0349999999,luc@example.com'
    ].join('\n');

    const res = await request(app)
      .post('/api/patients/import-csv')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'patients.csv');

    expect(res.status).toBe(200);
    expect(models.Patient.findOne).toHaveBeenCalledWith({
      where: { clinic_id: clinicA, patient_number: 'PAT-NEW-999' },
      transaction: 'tx'
    });
    expect(models.Patient.create).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: clinicA
    }), { transaction: 'tx' });
    expect(res.body.inserted).toBe(1);
    expect(res.body.updated).toBe(0);
  });

  test('imports semicolon CSV files with French headers', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);

    models.Patient.findOne.mockResolvedValueOnce(null);

    const csvContent = [
      'numero patient;prénom;nom;date de naissance;sexe;téléphone;ville',
      'PAT-FR-001;Andry;Rabe;12/05/1990;Homme;0343333333;Antsirabe'
    ].join('\n');

    const res = await request(app)
      .post('/api/patients/import-csv')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'patients.csv');

    expect(res.status).toBe(200);
    expect(res.body.inserted).toBe(1);
    expect(res.body.updated).toBe(0);
    expect(res.body.skipped).toBe(0);
    expect(models.Patient.create).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: clinicA,
      patient_number: 'PAT-FR-001',
      first_name: 'Andry',
      last_name: 'Rabe',
      date_of_birth: '1990-05-12',
      gender: 'M',
      phone_primary: '0343333333',
      city: 'Antsirabe'
    }), { transaction: 'tx' });
  });

  test('returns an error instead of success when every row is skipped', async () => {
    const { app, models } = buildApp('ADMIN', clinicA);

    const csvContent = [
      'nom,prenom,telephone',
      'Rakoto,Jean,0341111111'
    ].join('\n');

    const res = await request(app)
      .post('/api/patients/import-csv')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'patients.csv');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Aucun patient importé');
    expect(res.body.inserted).toBe(0);
    expect(res.body.updated).toBe(0);
    expect(res.body.skipped).toBe(1);
    expect(models.Patient.create).not.toHaveBeenCalled();
    expect(models.AuditLog.create).not.toHaveBeenCalled();
  });
});
