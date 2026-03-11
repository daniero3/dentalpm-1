const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function createAllTables() {
  try {
    console.log('🚀 Création de toutes les tables DentalPM...');

    await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    console.log('✅ Extension UUID activée');

    // 1. CLINICS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS clinics (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address VARCHAR(255),
        city VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        website VARCHAR(255),
        nif_number VARCHAR(50),
        stat_number VARCHAR(50),
        logo_url VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table clinics');

    // 2. USERS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'DENTIST',
        phone VARCHAR(20),
        specialization VARCHAR(100),
        nif_number VARCHAR(50),
        stat_number VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP,
        profile_image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table users');

    // 3. PATIENTS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        patient_number VARCHAR(20),
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE,
        gender VARCHAR(10),
        phone_primary VARCHAR(20),
        phone_secondary VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        postal_code VARCHAR(20),
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relationship VARCHAR(50),
        medical_history TEXT,
        allergies TEXT,
        current_medications TEXT,
        occupation VARCHAR(100),
        payer_type VARCHAR(20) DEFAULT 'SELF_PAY',
        preferred_language VARCHAR(20) DEFAULT 'FRENCH',
        consent_treatment BOOLEAN DEFAULT false,
        consent_data_processing BOOLEAN DEFAULT false,
        consent_sms_reminders BOOLEAN DEFAULT false,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table patients');

    // 4. PROCEDURES
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS procedures (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        default_price_mga DECIMAL(12,2) DEFAULT 0,
        duration_minutes INTEGER DEFAULT 30,
        requires_anesthesia BOOLEAN DEFAULT false,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table procedures');

    // 5. APPOINTMENTS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        dentist_id UUID REFERENCES users(id) ON DELETE SET NULL,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        appointment_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        duration_minutes INTEGER DEFAULT 60,
        appointment_type VARCHAR(50),
        reason TEXT,
        status VARCHAR(30) DEFAULT 'SCHEDULED',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table appointments');

    // 6. TREATMENTS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS treatments (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        procedure_id UUID REFERENCES procedures(id) ON DELETE SET NULL,
        performed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
        treatment_date DATE,
        tooth_numbers VARCHAR(100),
        status VARCHAR(30) DEFAULT 'COMPLETED',
        diagnosis TEXT,
        treatment_notes TEXT,
        cost_mga DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table treatments');

    // 7. PRICING SCHEDULES
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS pricing_schedules (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(30) DEFAULT 'STANDARD',
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table pricing_schedules');

    // 8. PROCEDURE FEES
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS procedure_fees (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        schedule_id UUID REFERENCES pricing_schedules(id) ON DELETE CASCADE,
        procedure_id UUID REFERENCES procedures(id) ON DELETE CASCADE,
        price_mga DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table procedure_fees');

    // 9. INVOICES
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE,
        document_type VARCHAR(20) DEFAULT 'INVOICE',
        patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        schedule_id UUID REFERENCES pricing_schedules(id) ON DELETE SET NULL,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        invoice_date DATE DEFAULT CURRENT_DATE,
        due_date DATE,
        subtotal_mga DECIMAL(12,2) DEFAULT 0,
        discount_percentage DECIMAL(5,2) DEFAULT 0,
        discount_amount_mga DECIMAL(12,2) DEFAULT 0,
        discount_type VARCHAR(30),
        tax_percentage DECIMAL(5,2) DEFAULT 0,
        tax_amount_mga DECIMAL(12,2) DEFAULT 0,
        total_mga DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'DRAFT',
        notes TEXT,
        nif_number VARCHAR(50),
        stat_number VARCHAR(50),
        clinic_nif VARCHAR(50),
        clinic_stat VARCHAR(50),
        validity_days INTEGER DEFAULT 30,
        sent_at TIMESTAMP,
        converted_to_invoice_id UUID,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table invoices');

    // 10. INVOICE ITEMS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
        procedure_id UUID REFERENCES procedures(id) ON DELETE SET NULL,
        description VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        unit_price_mga DECIMAL(12,2) DEFAULT 0,
        total_price_mga DECIMAL(12,2) DEFAULT 0,
        tooth_number VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table invoice_items');

    // 11. PAYMENTS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
        payment_number VARCHAR(50),
        amount_mga DECIMAL(12,2) DEFAULT 0,
        payment_method VARCHAR(30) DEFAULT 'CASH',
        status VARCHAR(30) DEFAULT 'COMPLETED',
        reference_number VARCHAR(100),
        notes TEXT,
        paid_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table payments');

    // 12. SMS LOGS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
        appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
        phone_number VARCHAR(20),
        message_type VARCHAR(50),
        message_content TEXT,
        carrier VARCHAR(30),
        status VARCHAR(30) DEFAULT 'PENDING',
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        cost_mga DECIMAL(8,2) DEFAULT 0,
        is_mock BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table sms_logs');

    // 13. AUDIT LOGS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50),
        resource_type VARCHAR(50),
        resource_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table audit_logs');

    // 14. SUPPLIERS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        contact_name VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(50) DEFAULT 'Madagascar',
        nif_number VARCHAR(50),
        stat_number VARCHAR(50),
        payment_terms VARCHAR(100),
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table suppliers');

    // 15. PRODUCTS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50),
        category VARCHAR(50),
        description TEXT,
        unit VARCHAR(20),
        unit_price_mga DECIMAL(12,2) DEFAULT 0,
        stock_quantity DECIMAL(10,2) DEFAULT 0,
        min_stock_level DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table products');

    // 16. STOCK MOVEMENTS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        movement_type VARCHAR(30),
        quantity DECIMAL(10,2),
        unit_price_mga DECIMAL(12,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table stock_movements');

    // 17. LABS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS labs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        contact_name VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table labs');

    // 18. LAB ORDERS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS lab_orders (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        lab_id UUID REFERENCES labs(id) ON DELETE SET NULL,
        patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
        dentist_id UUID REFERENCES users(id) ON DELETE SET NULL,
        order_number VARCHAR(50),
        order_date DATE DEFAULT CURRENT_DATE,
        due_date DATE,
        status VARCHAR(30) DEFAULT 'PENDING',
        total_mga DECIMAL(12,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table lab_orders');

    // 19. LAB ORDER ITEMS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS lab_order_items (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        lab_order_id UUID REFERENCES lab_orders(id) ON DELETE CASCADE,
        description VARCHAR(255),
        tooth_numbers VARCHAR(100),
        quantity INTEGER DEFAULT 1,
        unit_price_mga DECIMAL(12,2) DEFAULT 0,
        total_price_mga DECIMAL(12,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table lab_order_items');

    // 20. LAB DELIVERIES
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS lab_deliveries (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        lab_order_id UUID REFERENCES lab_orders(id) ON DELETE CASCADE,
        received_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        delivery_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(30) DEFAULT 'RECEIVED',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table lab_deliveries');

    // 21. MAILING CAMPAIGNS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mailing_campaigns (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        subject VARCHAR(255),
        content TEXT,
        status VARCHAR(30) DEFAULT 'DRAFT',
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table mailing_campaigns');

    // 22. MAILING LOGS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mailing_logs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        campaign_id UUID REFERENCES mailing_campaigns(id) ON DELETE CASCADE,
        patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
        email VARCHAR(100),
        status VARCHAR(30) DEFAULT 'SENT',
        sent_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table mailing_logs');

    // 23. SUBSCRIPTIONS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        plan VARCHAR(30) DEFAULT 'ESSENTIAL',
        status VARCHAR(30) DEFAULT 'ACTIVE',
        billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',
        monthly_price_mga DECIMAL(12,2) DEFAULT 0,
        annual_price_mga DECIMAL(12,2) DEFAULT 0,
        discount_type VARCHAR(30),
        discount_percentage DECIMAL(5,2) DEFAULT 0,
        start_date DATE,
        end_date DATE,
        trial_end_date DATE,
        auto_renew BOOLEAN DEFAULT true,
        max_practitioners INTEGER DEFAULT 2,
        features JSONB,
        cancelled_at TIMESTAMP,
        cancellation_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table subscriptions');

    // 24. SUBSCRIPTION INVOICES
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscription_invoices (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        invoice_number VARCHAR(50),
        amount_mga DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'PENDING',
        due_date DATE,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table subscription_invoices');

    // 25. PAYMENT REQUESTS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS payment_requests (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        verified_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        amount_mga DECIMAL(12,2) DEFAULT 0,
        payment_method VARCHAR(30),
        reference_number VARCHAR(100),
        status VARCHAR(30) DEFAULT 'PENDING',
        notes TEXT,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table payment_requests');

    // 26. DOCUMENTS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255),
        file_url VARCHAR(500),
        file_type VARCHAR(50),
        file_size INTEGER,
        category VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table documents');

    // 27. PRESCRIPTIONS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        prescriber_id UUID REFERENCES users(id) ON DELETE SET NULL,
        prescription_number VARCHAR(50),
        prescription_date DATE DEFAULT CURRENT_DATE,
        content TEXT,
        status VARCHAR(30) DEFAULT 'ACTIVE',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table prescriptions');

    // 28. PRESCRIPTION LOGS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS prescription_logs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table prescription_logs');

    // 29. TOOTH STATUS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tooth_statuses (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        tooth_number VARCHAR(10),
        status VARCHAR(30) DEFAULT 'HEALTHY',
        notes TEXT,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table tooth_statuses');

    // 30. TOOTH HISTORY
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tooth_histories (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        tooth_number VARCHAR(10),
        action VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table tooth_histories');

    // 31. MESSAGE TEMPLATES
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        name VARCHAR(100),
        type VARCHAR(30),
        subject VARCHAR(255),
        content TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table message_templates');

    // 32. MESSAGE QUEUE
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_queues (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
        type VARCHAR(30),
        content TEXT,
        status VARCHAR(30) DEFAULT 'PENDING',
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table message_queues');

    // 33. MESSAGE LOGS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_logs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
        type VARCHAR(30),
        content TEXT,
        status VARCHAR(30) DEFAULT 'SENT',
        sent_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table message_logs');

    // 34. PURCHASE ORDERS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
        supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        received_by UUID REFERENCES users(id) ON DELETE SET NULL,
        order_number VARCHAR(50),
        order_date DATE DEFAULT CURRENT_DATE,
        expected_date DATE,
        received_date DATE,
        status VARCHAR(30) DEFAULT 'DRAFT',
        total_mga DECIMAL(12,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table purchase_orders');

    // 35. PURCHASE ORDER ITEMS
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        description VARCHAR(255),
        quantity DECIMAL(10,2) DEFAULT 1,
        unit_price_mga DECIMAL(12,2) DEFAULT 0,
        total_price_mga DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ Table purchase_order_items');

    // ===== SEED USERS =====
    console.log('\n👥 Création des utilisateurs...');
    const adminHash = await bcrypt.hash('admin123', 12);
    const dentistHash = await bcrypt.hash('dentist123', 12);
    const secretaryHash = await bcrypt.hash('secretary123', 12);
    const accountantHash = await bcrypt.hash('accountant123', 12);

    await sequelize.query(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, phone)
      VALUES 
        (uuid_generate_v4(), 'admin', 'admin@dentalpm.mg', '${adminHash}', 'Administrateur', 'SUPER_ADMIN', '+261 32 12 000 01'),
        (uuid_generate_v4(), 'dr_rakoto', 'rakoto@dentalpm.mg', '${dentistHash}', 'Dr. Jean Rakoto', 'DENTIST', '+261 33 12 000 02'),
        (uuid_generate_v4(), 'dr_rasoanaivo', 'rasoanaivo@dentalpm.mg', '${dentistHash}', 'Dr. Marie Rasoanaivo', 'DENTIST', '+261 34 12 000 03'),
        (uuid_generate_v4(), 'secretary', 'secretaire@dentalpm.mg', '${secretaryHash}', 'Noro Randriamampionona', 'ASSISTANT', '+261 32 12 000 04'),
        (uuid_generate_v4(), 'accountant', 'comptable@dentalpm.mg', '${accountantHash}', 'Hery Andriamanana', 'ACCOUNTANT', '+261 33 12 000 05')
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log('✅ Utilisateurs créés');

    // ===== SEED PROCEDURES =====
    console.log('🦷 Création des procédures...');
    await sequelize.query(`
      INSERT INTO procedures (id, code, name, category, default_price_mga, duration_minutes, requires_anesthesia)
      VALUES
        (uuid_generate_v4(), 'CONS-001', 'Consultation initiale', 'CONSULTATION', 25000, 30, false),
        (uuid_generate_v4(), 'CONS-002', 'Consultation de controle', 'CONSULTATION', 20000, 20, false),
        (uuid_generate_v4(), 'CONS-003', 'Consultation urgence', 'EMERGENCY', 40000, 30, false),
        (uuid_generate_v4(), 'PREV-001', 'Detartrage', 'PREVENTION', 35000, 45, false),
        (uuid_generate_v4(), 'PREV-002', 'Polissage', 'PREVENTION', 15000, 20, false),
        (uuid_generate_v4(), 'REST-001', 'Obturation composite', 'RESTORATION', 75000, 60, true),
        (uuid_generate_v4(), 'REST-002', 'Obturation amalgame', 'RESTORATION', 50000, 45, true),
        (uuid_generate_v4(), 'REST-003', 'Couronne ceramique', 'RESTORATION', 250000, 90, false),
        (uuid_generate_v4(), 'ENDO-001', 'Traitement canalaire mono', 'ENDODONTICS', 150000, 90, true),
        (uuid_generate_v4(), 'ENDO-002', 'Traitement canalaire multi', 'ENDODONTICS', 200000, 120, true),
        (uuid_generate_v4(), 'CHIR-001', 'Extraction simple', 'ORAL_SURGERY', 30000, 30, true),
        (uuid_generate_v4(), 'CHIR-002', 'Extraction complexe', 'ORAL_SURGERY', 60000, 60, true),
        (uuid_generate_v4(), 'CHIR-003', 'Extraction dent de sagesse', 'ORAL_SURGERY', 80000, 90, true),
        (uuid_generate_v4(), 'PARO-001', 'Surfacage radiculaire', 'PERIODONTICS', 45000, 45, true),
        (uuid_generate_v4(), 'PROT-001', 'Prothese partielle amovible', 'PROSTHETICS', 300000, 60, false),
        (uuid_generate_v4(), 'PROT-002', 'Prothese complete', 'PROSTHETICS', 500000, 90, false),
        (uuid_generate_v4(), 'ORTH-001', 'Pose appareil dentaire', 'ORTHODONTICS', 800000, 120, false),
        (uuid_generate_v4(), 'ORTH-002', 'Controle orthodontique', 'ORTHODONTICS', 30000, 30, false)
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('✅ Procédures créées');

    console.log('\n🎉 Toutes les tables créées avec succès!');
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

createAllTables()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
