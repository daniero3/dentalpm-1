const sequelize = require('./database/connection');
const { v4: uuidv4 } = require('uuid');
const { SYNDICAL_2026_FEES } = require('./data/syndical_2026');

async function migrate() {
  try {
    console.log('1) Disabling foreign keys...');
    await sequelize.query(`PRAGMA foreign_keys = OFF`);
    
    console.log('2) Backing up existing data...');
    const [cabinets] = await sequelize.query(`SELECT * FROM pricing_schedules WHERE type = 'CABINET'`);
    console.log(`Found ${cabinets.length} CABINET schedules`);
    
    const cabinetIds = cabinets.map(c => `'${c.id}'`).join(',');
    let cabinetFees = [];
    if (cabinetIds) {
      [cabinetFees] = await sequelize.query(`SELECT * FROM procedure_fees WHERE schedule_id IN (${cabinetIds})`);
    }
    console.log(`Found ${cabinetFees.length} CABINET fees`);
    
    // Check for invoices referencing schedules
    const [invoices] = await sequelize.query(`SELECT COUNT(*) as count FROM invoices WHERE schedule_id IS NOT NULL`);
    console.log(`Invoices with schedule_id: ${invoices[0].count}`);
    
    console.log('3) Dropping old tables...');
    await sequelize.query(`DROP TABLE IF EXISTS procedure_fees`);
    await sequelize.query(`DROP TABLE IF EXISTS pricing_schedules`);
    
    console.log('4) Creating new tables with clinic_id nullable...');
    
    await sequelize.query(`
      CREATE TABLE pricing_schedules (
        id TEXT PRIMARY KEY,
        clinic_id TEXT,
        type TEXT NOT NULL CHECK(type IN ('SYNDICAL', 'CABINET')),
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_default INTEGER NOT NULL DEFAULT 0,
        year INTEGER DEFAULT 2026,
        version_code TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (clinic_id) REFERENCES clinics(id)
      )
    `);
    
    await sequelize.query(`
      CREATE TABLE procedure_fees (
        id TEXT PRIMARY KEY,
        schedule_id TEXT NOT NULL,
        procedure_code TEXT NOT NULL,
        label TEXT NOT NULL,
        price_mga REAL NOT NULL,
        category TEXT DEFAULT 'GENERAL',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (schedule_id) REFERENCES pricing_schedules(id)
      )
    `);
    
    // Create indexes
    await sequelize.query(`CREATE INDEX idx_ps_clinic_type ON pricing_schedules(clinic_id, type)`);
    await sequelize.query(`CREATE INDEX idx_ps_clinic_active ON pricing_schedules(clinic_id, is_active)`);
    await sequelize.query(`CREATE INDEX idx_pf_schedule ON procedure_fees(schedule_id)`);
    await sequelize.query(`CREATE INDEX idx_pf_code ON procedure_fees(procedure_code)`);
    
    console.log('5) Creating global SYNDICAL schedule...');
    const syndicalId = uuidv4();
    const now = new Date().toISOString();
    
    await sequelize.query(`
      INSERT INTO pricing_schedules (id, clinic_id, type, name, description, is_active, is_default, year, version_code, created_at, updated_at)
      VALUES (?, NULL, 'SYNDICAL', 'Tarification Syndicale 2026', 'Tarifs conventionnés - Nomenclature officielle Madagascar 2026', 1, 1, 2026, 'SYNDICAL_2026', ?, ?)
    `, { replacements: [syndicalId, now, now] });
    
    console.log(`Created global SYNDICAL: ${syndicalId}`);
    
    console.log('6) Inserting SYNDICAL 2026 fees...');
    for (const fee of SYNDICAL_2026_FEES) {
      await sequelize.query(`
        INSERT INTO procedure_fees (id, schedule_id, procedure_code, label, price_mga, category, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, { replacements: [uuidv4(), syndicalId, fee.procedure_code, fee.label, fee.price_mga, fee.category || 'GENERAL', now, now] });
    }
    console.log(`Inserted ${SYNDICAL_2026_FEES.length} SYNDICAL fees`);
    
    console.log('7) Restoring CABINET schedules...');
    for (const cabinet of cabinets) {
      await sequelize.query(`
        INSERT INTO pricing_schedules (id, clinic_id, type, name, description, is_active, is_default, year, version_code, created_at, updated_at)
        VALUES (?, ?, 'CABINET', ?, ?, ?, ?, ?, ?, ?, ?)
      `, { 
        replacements: [cabinet.id, cabinet.clinic_id, cabinet.name, cabinet.description, cabinet.is_active, cabinet.is_default, cabinet.year, cabinet.version_code, cabinet.created_at || now, cabinet.updated_at || now]
      });
    }
    
    console.log('8) Restoring CABINET fees...');
    for (const fee of cabinetFees) {
      await sequelize.query(`
        INSERT INTO procedure_fees (id, schedule_id, procedure_code, label, price_mga, category, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, { 
        replacements: [fee.id, fee.schedule_id, fee.procedure_code, fee.label, fee.price_mga, fee.category, fee.is_active, fee.created_at || now, fee.updated_at || now]
      });
    }
    console.log(`Restored ${cabinetFees.length} CABINET fees`);
    
    // Update invoices to point to global SYNDICAL if they had old SYNDICAL
    await sequelize.query(`UPDATE invoices SET schedule_id = ? WHERE schedule_id NOT IN (SELECT id FROM pricing_schedules)`, { replacements: [syndicalId] });
    
    console.log('9) Re-enabling foreign keys...');
    await sequelize.query(`PRAGMA foreign_keys = ON`);
    
    console.log('\n✅ Migration complete!');
    
    // Verify
    const [schedules] = await sequelize.query(`SELECT id, clinic_id, type, name, year FROM pricing_schedules`);
    console.log('\nFinal schedules:');
    schedules.forEach(s => console.log(`  ${s.type}: clinic_id=${s.clinic_id || 'NULL'}, id=${s.id.substring(0,8)}...`));
    
    const [feeCount] = await sequelize.query(`SELECT schedule_id, COUNT(*) as count FROM procedure_fees GROUP BY schedule_id`);
    console.log('\nFee counts:', feeCount);
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
