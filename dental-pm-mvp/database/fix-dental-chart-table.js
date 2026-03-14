const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function fixDentalChart() {
  try {
    console.log('🦷 Création table dental_charts...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS dental_charts (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        teeth_records JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(patient_id, clinic_id)
      );
    `);
    console.log('✅ Table dental_charts créée !');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

fixDentalChart()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
