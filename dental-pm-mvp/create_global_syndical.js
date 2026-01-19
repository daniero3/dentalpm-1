const sequelize = require('./database/connection');
const { v4: uuidv4 } = require('uuid');
const { SYNDICAL_2026_FEES } = require('./data/syndical_2026');

async function createGlobalSyndical() {
  try {
    console.log('Creating global SYNDICAL schedule...');
    
    const scheduleId = uuidv4();
    const now = new Date().toISOString();
    
    // Insert with raw SQL (bypasses Sequelize validation)
    await sequelize.query(`
      INSERT INTO pricing_schedules (id, clinic_id, type, name, description, is_active, is_default, year, version_code, created_at, updated_at)
      VALUES (?, NULL, 'SYNDICAL', 'Tarification Syndicale 2026', 'Tarifs conventionnés - Nomenclature officielle Madagascar 2026', 1, 1, 2026, 'SYNDICAL_2026', ?, ?)
    `, {
      replacements: [scheduleId, now, now]
    });
    
    console.log(`Created SYNDICAL schedule with id: ${scheduleId}`);
    
    // Insert fees
    console.log(`Inserting ${SYNDICAL_2026_FEES.length} fees...`);
    let inserted = 0;
    
    for (const fee of SYNDICAL_2026_FEES) {
      const feeId = uuidv4();
      await sequelize.query(`
        INSERT INTO procedure_fees (id, schedule_id, procedure_code, label, price_mga, category, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, {
        replacements: [feeId, scheduleId, fee.procedure_code, fee.label, fee.price_mga, fee.category || 'GENERAL', now, now]
      });
      inserted++;
    }
    
    console.log(`Inserted ${inserted} fees`);
    
    // Verify
    const [result] = await sequelize.query(`SELECT id, clinic_id, type, name, year FROM pricing_schedules WHERE type = 'SYNDICAL'`);
    console.log('Global SYNDICAL:', result);
    
    const [feeCount] = await sequelize.query(`SELECT COUNT(*) as count FROM procedure_fees WHERE schedule_id = ?`, { replacements: [scheduleId] });
    console.log('Fee count:', feeCount);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createGlobalSyndical();
