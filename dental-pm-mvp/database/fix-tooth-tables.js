const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function fixToothTables() {
  try {
    console.log('🦷 Correction des tables odontogramme...');

    // Supprimer et recréer tooth_histories
    await sequelize.query(`DROP TABLE IF EXISTS tooth_histories CASCADE;`);
    await sequelize.query(`
      CREATE TABLE tooth_histories (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        tooth_fdi VARCHAR(10) NOT NULL,
        surface VARCHAR(20),
        status VARCHAR(30) DEFAULT 'HEALTHY',
        note TEXT,
        action VARCHAR(50),
        performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table tooth_histories recréée');

    // Supprimer et recréer tooth_statuses
    await sequelize.query(`DROP TABLE IF EXISTS tooth_statuses CASCADE;`);
    await sequelize.query(`
      CREATE TABLE tooth_statuses (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        tooth_fdi VARCHAR(10) NOT NULL,
        surface VARCHAR(20),
        status VARCHAR(30) DEFAULT 'HEALTHY',
        note TEXT,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(clinic_id, patient_id, tooth_fdi)
      );
    `);
    console.log('✅ Table tooth_statuses recréée');

    console.log('🎉 Tables odontogramme corrigées !');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

fixToothTables()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
