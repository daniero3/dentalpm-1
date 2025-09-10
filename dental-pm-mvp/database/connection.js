const { Sequelize } = require('sequelize');
require('dotenv').config();

// PostgreSQL connection configuration
const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dental_pm_madagascar',
  username: process.env.DB_USER || 'dental_admin',
  password: process.env.DB_PASSWORD || 'dental_pass_2024',
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  // Connection pool configuration
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  
  // Timezone configuration for Madagascar
  timezone: '+03:00', // Indian/Antananarivo
  
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
    console.log('✅ PostgreSQL connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL:', error);
    return false;
  }
}

module.exports = sequelize;
module.exports.testConnection = testConnection;