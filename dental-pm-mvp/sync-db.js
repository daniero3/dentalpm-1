const { 
  sequelize, 
  Product, 
  Supplier, 
  StockMovement, 
  Lab, 
  LabOrder, 
  LabOrderItem, 
  LabDelivery, 
  MailingCampaign, 
  MailingLog 
} = require('./models');

async function syncDatabase() {
  try {
    console.log('🔄 Synchronizing new tables...');
    
    // Sync only the new models that don't exist yet
    const newModels = [
      Product,
      Supplier, 
      StockMovement,
      Lab,
      LabOrder,
      LabOrderItem,
      LabDelivery,
      MailingCampaign,
      MailingLog
    ];
    
    for (const model of newModels) {
      try {
        await model.sync({ force: false });
        console.log(`✅ ${model.name} table created/updated`);
      } catch (error) {
        console.log(`⚠️  ${model.name} table may already exist:`, error.message);
      }
    }
    
    console.log('✅ Database synchronization completed');
    console.log('📊 New tables are ready');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exit(1);
  }
}

syncDatabase();