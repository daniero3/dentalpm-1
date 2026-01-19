const sequelize = require('./database/connection');

async function fixSchema() {
  try {
    console.log('1) Fixing clinic_id constraint...');
    
    // Check current state
    const [schedules] = await sequelize.query(`SELECT id, clinic_id, type, name, year FROM pricing_schedules`);
    console.log('Current schedules:', schedules);
    
    // Delete all SYNDICAL fees first
    await sequelize.query(`DELETE FROM procedure_fees WHERE schedule_id IN (SELECT id FROM pricing_schedules WHERE type = 'SYNDICAL')`);
    console.log('Deleted SYNDICAL fees');
    
    // Delete all SYNDICAL schedules
    await sequelize.query(`DELETE FROM pricing_schedules WHERE type = 'SYNDICAL'`);
    console.log('Deleted SYNDICAL schedules');
    
    // Check remaining
    const [remaining] = await sequelize.query(`SELECT id, clinic_id, type, name FROM pricing_schedules`);
    console.log('Remaining schedules:', remaining);
    
    console.log('Done! SYNDICAL schedules deleted.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixSchema();
