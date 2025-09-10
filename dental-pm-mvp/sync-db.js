const { sequelize } = require('./models');

async function syncDatabase() {
  try {
    console.log('🔄 Synchronizing database...');
    
    // Sync all models
    await sequelize.sync({ alter: true });
    
    console.log('✅ Database synchronized successfully');
    console.log('📊 All tables created/updated');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exit(1);
  }
}

syncDatabase();