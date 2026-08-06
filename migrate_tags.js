require('dotenv').config();
const pool = require('./config/db');

async function migrateTags() {
  try {
    console.log('Running tags column migration...');
    await pool.query(`
      ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `);
    console.log('✅ Migration complete: tags column ensured on candidates table.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrateTags();
