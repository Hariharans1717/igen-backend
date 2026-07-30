const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

async function fixColumns() {
  console.log('🚀 Adding notice_period, current_location, remarks, department columns to candidates table...');
  try {
    await pool.query(`
      ALTER TABLE candidates
        ADD COLUMN IF NOT EXISTS notice_period VARCHAR(100),
        ADD COLUMN IF NOT EXISTS current_location VARCHAR(100),
        ADD COLUMN IF NOT EXISTS remarks TEXT,
        ADD COLUMN IF NOT EXISTS department VARCHAR(100);
    `);
    console.log('✅ Added missing columns to candidates table!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to add columns:', err);
    process.exit(1);
  }
}

fixColumns();
