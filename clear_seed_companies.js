const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

async function clearSeedCompanies() {
  console.log('🧹 Clearing seeded companies from database...');
  try {
    const res = await pool.query(`
      TRUNCATE TABLE companies CASCADE;
    `);
    console.log(`✅ Cleared all companies and branches from database.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to clear seeded companies:', err);
    process.exit(1);
  }
}

clearSeedCompanies();
