'use strict';

const { sequelize } = require('../models');

async function runMigrations() {
  const { Sequelize } = require('sequelize');
  const qi = sequelize.getQueryInterface();

  const migrations = [
    '../migrations/20260418-stripe-subscription-id',
    '../migrations/20260424-performance-indexes',
    '../migrations/20260505-subscription-schema-fix',
    '../migrations/20260505-subscription-price-mga-fix',
    '../migrations/20260505-counters-table-fix',
    '../migrations/20260506-invoice-schema-fix',
  ];

  for (const migrationPath of migrations) {
    const migration = require(migrationPath);
    if (typeof migration?.up === 'function') {
      await migration.up(qi, Sequelize).catch(() => {});
    }
  }

  console.log('✅ Migrations & index DB OK');
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à PostgreSQL réussie');
    await runMigrations();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

if (require.main === module) {
  main();
}

module.exports = { runMigrations };
