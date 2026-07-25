require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

(async () => {
  try {
    // List all tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('📋 Tables:', tables.rows.map(t => t.table_name).join(', '));

    // Delete related tables first (foreign key order)
    const deleteOrder = [
      'candidate_timeline',
      'job_submissions',
      'submission_candidates',
      'interview_schedules',
      'interviews',
      'candidates'
    ];

    for (const table of deleteOrder) {
      try {
        const res = await pool.query(`DELETE FROM ${table}`);
        console.log(`✅ Deleted from ${table}: ${res.rowCount} rows`);
      } catch (e) {
        if (e.message.includes('does not exist')) {
          console.log(`⚠️  Table "${table}" does not exist, skipping.`);
        } else {
          console.error(`❌ Error deleting from ${table}:`, e.message);
        }
      }
    }

    const remaining = await pool.query('SELECT COUNT(*) FROM candidates');
    console.log(`\n🎉 Done! Remaining candidates: ${remaining.rows[0].count}`);
  } catch (e) {
    console.error('❌ Fatal error:', e.message);
  } finally {
    await pool.end();
  }
})();
