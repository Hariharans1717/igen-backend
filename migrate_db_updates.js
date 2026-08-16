require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('1. Adding columns to candidates table...');
    await client.query(`
      ALTER TABLE candidates
      ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS passport_expiry_date DATE,
      ADD COLUMN IF NOT EXISTS lwd DATE,
      ADD COLUMN IF NOT EXISTS priority BOOLEAN DEFAULT FALSE;
    `);

    console.log('2. Modifying candidate_salary table...');
    await client.query(`
      ALTER TABLE candidate_salary DROP CONSTRAINT IF EXISTS candidate_salary_candidate_id_key;
    `);
    
    await client.query(`
      ALTER TABLE candidate_salary ADD COLUMN IF NOT EXISTS location VARCHAR(100);
    `);

    console.log('3. Initializing candidate_id_seq...');
    // Find the max sequence number among existing candidates with ID format IGxxxx
    const maxRes = await client.query(`
      SELECT MAX(CAST(SUBSTRING(candidate_code FROM 3) AS INTEGER)) as max_val
      FROM candidates 
      WHERE candidate_code LIKE 'IG%' AND candidate_code ~ '^IG[0-9]+$'
    `);
    
    let nextVal = 1;
    if (maxRes.rows[0].max_val) {
      nextVal = parseInt(maxRes.rows[0].max_val, 10) + 1;
    }

    await client.query(`CREATE SEQUENCE IF NOT EXISTS candidate_id_seq START WITH 1`);
    await client.query(`SELECT setval('candidate_id_seq', $1, false)`, [nextVal]);
    
    console.log(`Initialized candidate_id_seq to start at ${nextVal}`);

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
