'use strict';

// Additive, idempotent migration. Existing patient, invoice and payment data are untouched.
module.exports = {
  async up(queryInterface) {
    const db = queryInterface.sequelize;
    await db.query("CREATE TABLE IF NOT EXISTS orthodontic_cases (" +
      "id UUID PRIMARY KEY, clinic_id UUID NOT NULL REFERENCES clinics(id), " +
      "patient_id UUID NOT NULL REFERENCES patients(id), dentist_id UUID REFERENCES users(id), " +
      "appliance_type VARCHAR(30) NOT NULL DEFAULT 'FIXED', " +
      "status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', " +
      "start_date DATE NOT NULL, expected_end_date DATE, clinical_notes TEXT, " +
      "billing_mode VARCHAR(20) NOT NULL CHECK (billing_mode IN ('FORFAIT','MONTHLY')), " +
      "total_mga NUMERIC(12,2), upfront_mga NUMERIC(12,2) NOT NULL DEFAULT 0, " +
      "monthly_mga NUMERIC(12,2) NOT NULL, months INTEGER NOT NULL CHECK (months BETWEEN 1 AND 60), " +
      "first_due_date DATE NOT NULL, " +
      "global_invoice_id UUID UNIQUE REFERENCES invoices(id), " +
      "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
      "CONSTRAINT orthodontic_price_positive CHECK (monthly_mga > 0 AND upfront_mga >= 0))");
    await db.query("CREATE TABLE IF NOT EXISTS orthodontic_dues (" +
      "id UUID PRIMARY KEY, clinic_id UUID NOT NULL REFERENCES clinics(id), " +
      "case_id UUID NOT NULL REFERENCES orthodontic_cases(id), " +
      "sequence INTEGER NOT NULL, due_date DATE NOT NULL, amount_mga NUMERIC(12,2) NOT NULL CHECK (amount_mga > 0), " +
      "invoice_id UUID UNIQUE REFERENCES invoices(id), " +
      "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
      "CONSTRAINT orthodontic_due_sequence_unique UNIQUE (case_id, sequence))");
    await db.query("CREATE TABLE IF NOT EXISTS orthodontic_visits (" +
      "id UUID PRIMARY KEY, clinic_id UUID NOT NULL REFERENCES clinics(id), " +
      "case_id UUID NOT NULL REFERENCES orthodontic_cases(id), appointment_id UUID REFERENCES appointments(id), " +
      "visit_date DATE NOT NULL, next_visit_date DATE, notes TEXT, " +
      "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    await db.query("CREATE INDEX IF NOT EXISTS orthodontic_cases_clinic_status ON orthodontic_cases(clinic_id,status)");
    await db.query("CREATE INDEX IF NOT EXISTS orthodontic_cases_clinic_patient ON orthodontic_cases(clinic_id,patient_id)");
    await db.query("CREATE INDEX IF NOT EXISTS orthodontic_dues_clinic_date ON orthodontic_dues(clinic_id,due_date)");
    await db.query("CREATE INDEX IF NOT EXISTS orthodontic_visits_clinic_case ON orthodontic_visits(clinic_id,case_id)");
  },
  async down() { /* Keep clinical and financial records intact. */ }
};
