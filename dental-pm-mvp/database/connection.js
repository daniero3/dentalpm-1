const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection configuration
// Priority: DATABASE_URL (production) > DB_HOST config
let sequelize;

if (process.env.DATABASE_URL) {
  // Production: Use DATABASE_URL (Postgres connection string)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    pool: {
      max: 15,       // Augmenté pour Railway (15 connexions max)
      min: 2,        // Garder 2 connexions chaudes
      acquire: 30000,
      idle: 10000,
      evict: 1000,   // Nettoyage connexions mortes chaque seconde
    },
    timezone: '+03:00',
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
} else if (process.env.DB_HOST && process.env.NODE_ENV !== 'sqlite') {
  // PostgreSQL connection via individual env vars
  console.log('🔄 Using DB_HOST for PostgreSQL connection');
  sequelize = new Sequelize({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 15,       // Augmenté pour Railway (15 connexions max)
      min: 2,        // Garder 2 connexions chaudes
      acquire: 30000,
      idle: 10000,
      evict: 1000,   // Nettoyage connexions mortes chaque seconde
    },
    timezone: '+03:00',
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
} else {
  throw new Error(
    'Database configuration missing. Set DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD.'
  );
}

// Test connection function
async function testConnection() {
  try {
    await sequelize.authenticate();
    const dbType = sequelize.getDialect().toUpperCase();
    console.log(`✅ ${dbType} connection established successfully`);
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    return false;
  }
}

module.exports = sequelize;
module.exports.testConnection = testConnection;
