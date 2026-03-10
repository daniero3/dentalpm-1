const { sequelize } = require('../models');
const {
  User,
  Procedure
} = require('../models');

const seedData = {
  users: [
    {
      username: 'admin',
      email: 'admin@dentalpm.mg',
      password_hash: 'admin123',
      full_name: 'Dr. Administrateur Système',
      role: 'SUPER_ADMIN',
      phone: '+261 32 12 000 01',
      specialization: 'Administration',
      nif_number: 'NIF2024001',
      stat_number: 'STAT2024001'
    },
    {
      username: 'dr_rakoto',
      email: 'rakoto@dentalpm.mg',
      password_hash: 'dentist123',
      full_name: 'Dr. Jean Rakoto',
      role: 'DENTIST',
      phone: '+261 33 12 000 02',
      specialization: 'Chirurgie orale',
      nif_number: 'NIF2024002',
      stat_number: 'STAT2024002'
    },
    {
      username: 'dr_rasoanaivo',
      email: 'rasoanaivo@dentalpm.mg',
      password_hash: 'dentist123',
      full_name: 'Dr. Marie Rasoanaivo',
      role: 'DENTIST',
      phone: '+261 34 12 000 03',
      specialization: 'Orthodontie'
    },
    {
      username: 'secretary',
      email: 'secretaire@dentalpm.mg',
      password_hash: 'secretary123',
      full_name: 'Noro Randriamampionona',
      role: 'ASSISTANT',
      phone: '+261 32 12 000 04'
    },
    {
      username: 'accountant',
      email: 'comptable@dentalpm.mg',
      password_hash: 'accountant123',
      full_name: 'Hery Andriamanana',
      role: 'ACCOUNTANT',
      phone: '+261 33 12 000 05'
    }
  ],

  procedures: [
    { code: 'CONS-001', name: 'Consultation initiale', category: 'CONSULTATION', default_price_mga: 25000, duration_minutes: 30 },
    { code: 'CONS-002', name: 'Consultation de contrôle', category: 'CONSULTATION', default_price_mga: 20000, duration_minutes: 20 },
    { code: 'CONS-003', name: 'Consultation urgence', category: 'EMERGENCY', default_price_mga: 40000, duration_minutes: 30 },
    { code: 'PREV-001', name: 'Détartrage', category: 'PREVENTION', default_price_mga: 35000, duration_minutes: 45 },
    { code: 'PREV-002', name: 'Polissage', category: 'PREVENTION', default_price_mga: 15000, duration_minutes: 20 },
    { code: 'PREV-003', name: 'Application de fluor', category: 'PREVENTION', default_price_mga: 10000, duration_minutes: 15 },
    { code: 'REST-001', name: 'Obturation composite', category: 'RESTORATION', default_price_mga: 75000, duration_minutes: 60, requires_anesthesia: true },
    { code: 'REST-002', name: 'Obturation amalgame', category: 'RESTORATION', default_price_mga: 50000, duration_minutes: 45, requires_anesthesia: true },
    { code: 'REST-003', name: 'Couronne ceramique', category: 'RESTORATION', default_price_mga: 250000, duration_minutes: 90 },
    { code: 'ENDO-001', name: 'Traitement canalaire mono', category: 'ENDODONTICS', default_price_mga: 150000, duration_minutes: 90, requires_anesthesia: true },
    { code: 'ENDO-002', name: 'Traitement canalaire multi', category: 'ENDODONTICS', default_price_mga: 200000, duration_minutes: 120, requires_anesthesia: true },
    { code: 'CHIR-001', name: 'Extraction simple', category: 'ORAL_SURGERY', default_price_mga: 30000, duration_minutes: 30, requires_anesthesia: true },
    { code: 'CHIR-002', name: 'Extraction complexe', category: 'ORAL_SURGERY', default_price_mga: 60000, duration_minutes: 60, requires_anesthesia: true },
    { code: 'CHIR-003', name: 'Extraction dent de sagesse', category: 'ORAL_SURGERY', default_price_mga: 80000, duration_minutes: 90, requires_anesthesia: true },
    { code: 'PARO-001', name: 'Surfacage radiculaire', category: 'PERIODONTICS', default_price_mga: 45000, duration_minutes: 45, requires_anesthesia: true },
    { code: 'PARO-002', name: 'Greffe gingivale', category: 'PERIODONTICS', default_price_mga: 120000, duration_minutes: 60, requires_anesthesia: true },
    { code: 'PROT-001', name: 'Prothese partielle amovible', category: 'PROSTHETICS', default_price_mga: 300000, duration_minutes: 60 },
    { code: 'PROT-002', name: 'Prothese complete', category: 'PROSTHETICS', default_price_mga: 500000, duration_minutes: 90 },
    { code: 'ORTH-001', name: 'Pose appareil dentaire', category: 'ORTHODONTICS', default_price_mga: 800000, duration_minutes: 120 },
    { code: 'ORTH-002', name: 'Controle orthodontique', category: 'ORTHODONTICS', default_price_mga: 30000, duration_minutes: 30 }
  ]
};

async function seedDatabase() {
  try {
    console.log('🌱 Démarrage du seeding...');

    // Sync sans modifier les tables existantes
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Base de données synchronisée');

    // Seed users
    console.log('👥 Création des utilisateurs...');
    const users = [];
    for (const userData of seedData.users) {
      try {
        const existingUser = await User.findOne({ 
          where: { username: userData.username } 
        });
        if (existingUser) {
          console.log(`   ⚠️ Utilisateur existe déjà: ${userData.username}`);
          users.push(existingUser);
        } else {
          const user = await User.create(userData);
          users.push(user);
          console.log(`   ✅ Utilisateur créé: ${user.full_name}`);
        }
      } catch (err) {
        console.log(`   ❌ Erreur utilisateur ${userData.username}:`, err.message);
      }
    }

    // Seed procedures
    console.log('🦷 Création des procédures...');
    for (const procedureData of seedData.procedures) {
      try {
        const existing = await Procedure.findOne({ 
          where: { code: procedureData.code } 
        });
        if (!existing) {
          await Procedure.create(procedureData);
        }
      } catch (err) {
        console.log(`   ❌ Erreur procédure ${procedureData.code}:`, err.message);
      }
    }
    console.log('   ✅ Procédures créées');

    console.log('\n🎉 Seeding terminé!');
    console.log('👨‍💼 Admin: admin / admin123');
    console.log('🦷 Dentiste: dr_rakoto / dentist123');
    console.log('👩‍💼 Assistante: secretary / secretary123');
    console.log('💰 Comptable: accountant / accountant123');

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error.message);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Seeding failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
