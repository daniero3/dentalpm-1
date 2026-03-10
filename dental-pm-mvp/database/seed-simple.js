const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function seedSimple() {
  try {
    console.log('🌱 Seed simple démarrage...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'DENTIST',
        phone VARCHAR(20),
        specialization VARCHAR(100),
        nif_number VARCHAR(50),
        stat_number VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table users prête');

    const adminHash = await bcrypt.hash('admin123', 10);
    const dentistHash = await bcrypt.hash('dentist123', 10);
    const secretaryHash = await bcrypt.hash('secretary123', 10);
    const accountantHash = await bcrypt.hash('accountant123', 10);

    await sequelize.query(`
      INSERT INTO users (username, email, password_hash, full_name, role, phone)
      VALUES 
        ('admin', 'admin@dentalpm.mg', '${adminHash}', 'Administrateur', 'SUPER_ADMIN', '+261 32 12 000 01'),
        ('dr_rakoto', 'rakoto@dentalpm.mg', '${dentistHash}', 'Dr. Jean Rakoto', 'DENTIST', '+261 33 12 000 02'),
        ('dr_rasoanaivo', 'rasoanaivo@dentalpm.mg', '${dentistHash}', 'Dr. Marie Rasoanaivo', 'DENTIST', '+261 34 12 000 03'),
        ('secretary', 'secretaire@dentalpm.mg', '${secretaryHash}', 'Noro Randriamampionona', 'ASSISTANT', '+261 32 12 000 04'),
        ('accountant', 'comptable@dentalpm.mg', '${accountantHash}', 'Hery Andriamanana', 'ACCOUNTANT', '+261 33 12 000 05')
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log('✅ Utilisateurs créés');

    console.log('🎉 Seed terminé avec succès!');
    console.log('👨‍💼 admin / admin123');
    console.log('🦷 dr_rakoto / dentist123');
    console.log('👩‍💼 secretary / secretary123');
    console.log('💰 accountant / accountant123');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

seedSimple()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
