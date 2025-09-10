const { sequelize } = require('../models');
const {
  User,
  Patient,
  Procedure,
  Appointment,
  Treatment,
  Invoice,
  InvoiceItem,
  Payment,
  SmsLog
} = require('../models');

// Seed data for Madagascar dental practice
const seedData = {
  users: [
    {
      username: 'admin',
      email: 'admin@dentalpm.mg',
      password_hash: 'admin123', // Will be hashed by model
      full_name: 'Dr. Administrateur Système',
      role: 'ADMIN',
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

  patients: [
    {
      first_name: 'Hery',
      last_name: 'Rasoanaivo',
      date_of_birth: '1985-03-15',
      gender: 'MALE',
      phone_primary: '+261 34 12 345 67',
      phone_secondary: '+261 32 98 765 43',
      email: 'hery.rasoanaivo@gmail.com',
      address: 'Lot II M 25 Antananarivo 101, Madagascar',
      city: 'Antananarivo',
      postal_code: '101',
      emergency_contact_name: 'Noro Rasoanaivo',
      emergency_contact_phone: '+261 33 98 765 43',
      emergency_contact_relationship: 'Épouse',
      medical_history: 'Hypertension artérielle, diabète type 2',
      allergies: 'Pénicilline, fruits de mer',
      current_medications: 'Metformine 500mg, Amlodipine 5mg',
      occupation: 'Ingénieur informatique',
      preferred_language: 'FRENCH',
      consent_treatment: true,
      consent_data_processing: true,
      consent_sms_reminders: true
    },
    {
      first_name: 'Marie',
      last_name: 'Rakoto',
      date_of_birth: '1992-07-22',
      gender: 'FEMALE',
      phone_primary: '+261 32 11 223 44',
      email: 'marie.rakoto@yahoo.fr',
      address: 'Analakely Antananarivo, Madagascar',
      city: 'Antananarivo',
      emergency_contact_name: 'Paul Rakoto',
      emergency_contact_phone: '+261 34 55 667 78',
      emergency_contact_relationship: 'Père',
      medical_history: 'Aucun antécédent particulier',
      allergies: 'Aucune allergie connue',
      occupation: 'Enseignante',
      preferred_language: 'FRENCH',
      consent_treatment: true,
      consent_data_processing: true
    },
    {
      first_name: 'Jean',
      last_name: 'Randriamampionona',
      date_of_birth: '1978-11-08',
      gender: 'MALE',
      phone_primary: '+261 33 44 556 67',
      address: 'Toamasina, Madagascar',
      city: 'Toamasina',
      emergency_contact_name: 'Soa Randriamampionona',
      emergency_contact_phone: '+261 32 77 889 90',
      emergency_contact_relationship: 'Épouse',
      medical_history: 'Asthme léger',
      current_medications: 'Ventoline en cas de crise',
      occupation: 'Commerçant',
      preferred_language: 'MALAGASY',
      consent_treatment: true,
      consent_data_processing: true,
      consent_sms_reminders: true
    },
    {
      first_name: 'Soa',
      last_name: 'Andriamanana',
      date_of_birth: '1995-02-14',
      gender: 'FEMALE',
      phone_primary: '+261 34 99 887 76',
      email: 'soa.andriamanana@hotmail.com',
      address: 'Fianarantsoa, Madagascar',
      city: 'Fianarantsoa',
      emergency_contact_name: 'Rabe Andriamanana',
      emergency_contact_phone: '+261 33 11 223 34',
      emergency_contact_relationship: 'Frère',
      occupation: 'Étudiante',
      preferred_language: 'FRENCH',
      consent_treatment: true,
      consent_data_processing: true
    }
  ],

  procedures: [
    // Consultation
    { code: 'CONS-001', name: 'Consultation initiale', category: 'CONSULTATION', default_price_mga: 25000, duration_minutes: 30 },
    { code: 'CONS-002', name: 'Consultation de contrôle', category: 'CONSULTATION', default_price_mga: 20000, duration_minutes: 20 },
    { code: 'CONS-003', name: 'Consultation d\'urgence', category: 'EMERGENCY', default_price_mga: 40000, duration_minutes: 30 },
    
    // Prévention
    { code: 'PREV-001', name: 'Détartrage', category: 'PREVENTION', default_price_mga: 35000, duration_minutes: 45 },
    { code: 'PREV-002', name: 'Polissage', category: 'PREVENTION', default_price_mga: 15000, duration_minutes: 20 },
    { code: 'PREV-003', name: 'Application de fluor', category: 'PREVENTION', default_price_mga: 10000, duration_minutes: 15 },
    
    // Restauration
    { code: 'REST-001', name: 'Obturation composite', category: 'RESTORATION', default_price_mga: 75000, duration_minutes: 60, requires_anesthesia: true },
    { code: 'REST-002', name: 'Obturation amalgame', category: 'RESTORATION', default_price_mga: 50000, duration_minutes: 45, requires_anesthesia: true },
    { code: 'REST-003', name: 'Couronne céramique', category: 'RESTORATION', default_price_mga: 250000, duration_minutes: 90 },
    
    // Endodontie
    { code: 'ENDO-001', name: 'Traitement canalaire mono-radiculaire', category: 'ENDODONTICS', default_price_mga: 150000, duration_minutes: 90, requires_anesthesia: true },
    { code: 'ENDO-002', name: 'Traitement canalaire multi-radiculaire', category: 'ENDODONTICS', default_price_mga: 200000, duration_minutes: 120, requires_anesthesia: true },
    
    // Chirurgie
    { code: 'CHIR-001', name: 'Extraction simple', category: 'ORAL_SURGERY', default_price_mga: 30000, duration_minutes: 30, requires_anesthesia: true },
    { code: 'CHIR-002', name: 'Extraction complexe', category: 'ORAL_SURGERY', default_price_mga: 60000, duration_minutes: 60, requires_anesthesia: true },
    { code: 'CHIR-003', name: 'Extraction dent de sagesse', category: 'ORAL_SURGERY', default_price_mga: 80000, duration_minutes: 90, requires_anesthesia: true },
    
    // Parodontologie
    { code: 'PARO-001', name: 'Surfaçage radiculaire', category: 'PERIODONTICS', default_price_mga: 45000, duration_minutes: 45, requires_anesthesia: true },
    { code: 'PARO-002', name: 'Greffe gingivale', category: 'PERIODONTICS', default_price_mga: 120000, duration_minutes: 60, requires_anesthesia: true },
    
    // Prothèse
    { code: 'PROT-001', name: 'Prothèse partielle amovible', category: 'PROSTHETICS', default_price_mga: 300000, duration_minutes: 60 },
    { code: 'PROT-002', name: 'Prothèse complète', category: 'PROSTHETICS', default_price_mga: 500000, duration_minutes: 90 },
    
    // Orthodontie
    { code: 'ORTH-001', name: 'Pose d\'appareil dentaire', category: 'ORTHODONTICS', default_price_mga: 800000, duration_minutes: 120 },
    { code: 'ORTH-002', name: 'Contrôle orthodontique', category: 'ORTHODONTICS', default_price_mga: 30000, duration_minutes: 30 }
  ]
};

async function seedDatabase() {
  try {
    console.log('🌱 Démarrage du seeding de la base de données...');

    // Sync database (create tables)
    await sequelize.sync({ force: true });
    console.log('✅ Tables créées');

    // Seed users
    console.log('👥 Création des utilisateurs...');
    const users = [];
    for (const userData of seedData.users) {
      const user = await User.create(userData);
      users.push(user);
      console.log(`   ✅ Utilisateur créé: ${user.full_name} (${user.role})`);
    }

    // Seed procedures
    console.log('🦷 Création des procédures...');
    const procedures = [];
    for (const procedureData of seedData.procedures) {
      const procedure = await Procedure.create(procedureData);
      procedures.push(procedure);
    }
    console.log(`   ✅ ${procedures.length} procédures créées`);

    // Seed patients
    console.log('👨‍⚕️ Création des patients...');
    const patients = [];
    const dentistUser = users.find(u => u.role === 'DENTIST');
    
    for (let i = 0; i < seedData.patients.length; i++) {
      const patientData = seedData.patients[i];
      const patient = await Patient.create({
        ...patientData,
        patient_number: `PAT-${String(i + 1).padStart(6, '0')}`,
        created_by_user_id: dentistUser.id
      });
      patients.push(patient);
      console.log(`   ✅ Patient créé: ${patient.first_name} ${patient.last_name}`);
    }

    // Create sample appointments
    console.log('📅 Création des rendez-vous...');
    const appointments = [];
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < 3; i++) {
      const appointmentDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const appointment = await Appointment.create({
        patient_id: patients[i % patients.length].id,
        dentist_id: dentistUser.id,
        appointment_date: appointmentDate.toISOString().split('T')[0],
        start_time: `${9 + i}:00`,
        end_time: `${9 + i + 1}:00`,
        duration_minutes: 60,
        appointment_type: ['CONSULTATION', 'TREATMENT', 'CHECK_UP'][i % 3],
        reason: ['Douleur dentaire', 'Contrôle routine', 'Nettoyage'][i % 3],
        status: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'][i % 3]
      });
      appointments.push(appointment);
    }
    console.log(`   ✅ ${appointments.length} rendez-vous créés`);

    // Create sample treatments
    console.log('🔧 Création des traitements...');
    const treatments = [];
    for (let i = 0; i < 5; i++) {
      const treatment = await Treatment.create({
        patient_id: patients[i % patients.length].id,
        procedure_id: procedures[i % procedures.length].id,
        performed_by_user_id: dentistUser.id,
        treatment_date: new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tooth_numbers: `${11 + i}`,
        status: 'COMPLETED',
        diagnosis: `Diagnostic pour dent ${11 + i}`,
        treatment_notes: `Traitement réalisé avec succès`,
        cost_mga: procedures[i % procedures.length].default_price_mga
      });
      treatments.push(treatment);
    }
    console.log(`   ✅ ${treatments.length} traitements créés`);

    // Create sample invoices
    console.log('🧾 Création des factures...');
    const invoices = [];
    for (let i = 0; i < 4; i++) {
      const patient = patients[i % patients.length];
      const procedure = procedures[i % procedures.length];
      
      const subtotal = procedure.default_price_mga;
      const discountPercentage = i === 0 ? 15 : (i === 1 ? 20 : 0); // Syndical, humanitarian discounts
      const discountAmount = (subtotal * discountPercentage) / 100;
      const total = subtotal - discountAmount;
      
      const invoice = await Invoice.create({
        patient_id: patient.id,
        invoice_number: `FACT-${String(i + 1).padStart(6, '0')}`,
        subtotal_mga: subtotal,
        discount_percentage: discountPercentage,
        discount_amount_mga: discountAmount,
        discount_type: i === 0 ? 'SYNDICAL' : (i === 1 ? 'HUMANITARIAN' : null),
        total_mga: total,
        status: ['PAID', 'SENT', 'PARTIAL', 'DRAFT'][i % 4],
        created_by_user_id: dentistUser.id,
        nif_number: patient.email ? 'NIF' + Date.now().toString().slice(-6) : null,
        notes: `Facture pour ${patient.first_name} ${patient.last_name}`
      });
      
      // Create invoice item
      await InvoiceItem.create({
        invoice_id: invoice.id,
        procedure_id: procedure.id,
        description: procedure.name,
        quantity: 1,
        unit_price_mga: procedure.default_price_mga,
        total_price_mga: procedure.default_price_mga
      });
      
      invoices.push(invoice);
      
      // Create payment for paid invoices
      if (invoice.status === 'PAID') {
        await Payment.create({
          invoice_id: invoice.id,
          amount_mga: total,
          payment_method: ['CASH', 'MVOLA', 'ORANGE_MONEY'][i % 3],
          status: 'COMPLETED'
        });
      }
    }
    console.log(`   ✅ ${invoices.length} factures créées`);

    // Create sample SMS logs
    console.log('📱 Création des logs SMS...');
    for (let i = 0; i < 3; i++) {
      await SmsLog.create({
        patient_id: patients[i].id,
        appointment_id: appointments[i] ? appointments[i].id : null,
        phone_number: patients[i].phone_primary,
        message_type: 'APPOINTMENT_REMINDER',
        message_content: `Bonjour ${patients[i].first_name}, rappel de votre RDV dentaire demain à 9h00. Cabinet Dentaire Madagascar.`,
        carrier: ['TELMA', 'ORANGE', 'AIRTEL'][i % 3],
        status: 'DELIVERED',
        sent_at: new Date(),
        delivered_at: new Date(),
        cost_mga: 50,
        is_mock: true
      });
    }
    console.log('   ✅ 3 logs SMS créés');

    console.log('\n🎉 Seeding terminé avec succès!');
    console.log('\n📋 Comptes de test créés:');
    console.log('   👨‍💼 Admin: admin / admin123');
    console.log('   🦷 Dentiste: dr_rakoto / dentist123');
    console.log('   🦷 Dentiste: dr_rasoanaivo / dentist123');
    console.log('   👩‍💼 Assistante: secretary / secretary123');
    console.log('   💰 Comptable: accountant / accountant123');
    console.log('\n📊 Données créées:');
    console.log(`   👥 ${users.length} utilisateurs`);
    console.log(`   👨‍⚕️ ${patients.length} patients`);
    console.log(`   🦷 ${procedures.length} procédures`);
    console.log(`   📅 ${appointments.length} rendez-vous`);
    console.log(`   🔧 ${treatments.length} traitements`);
    console.log(`   🧾 ${invoices.length} factures`);
    console.log('   📱 3 logs SMS');
    
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };