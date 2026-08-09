require('dotenv').config();
const pool = require('./config/db');

async function migrate16Stages() {
  try {
    console.log('Running 16-stages database migration...');
    
    // Alter candidates.status to VARCHAR(100)
    console.log('Altering candidates.status column to VARCHAR...');
    await pool.query(`
      ALTER TABLE candidates ALTER COLUMN status TYPE VARCHAR(100);
    `);
    
    // Add sub_status column to interviews
    console.log('Adding sub_status column to interviews table...');
    await pool.query(`
      ALTER TABLE interviews ADD COLUMN IF NOT EXISTS sub_status VARCHAR(100) DEFAULT 'awaiting_invite';
    `);
    
    console.log('✅ Migration complete successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate16Stages();
