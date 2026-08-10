const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

async function runMigration() {
  console.log('🚀 Running Candidate Status History Migration...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidate_status_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        changed_by UUID,
        changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created candidate_status_history table');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
