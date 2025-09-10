const { Sequelize } = require('sequelize');
require('dotenv').config();

// SQLite connection for development/testing when PostgreSQL not available
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.NODE_ENV === 'test' ? ':memory:' : './database/dental_pm_madagascar.sqlite',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  // Additional options
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

// Test connection function
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to SQLite:', error);
    return false;
  }
}

module.exports = sequelize;
module.exports.testConnection = testConnection;