const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE interviews 
      ADD COLUMN IF NOT EXISTS candidate_id_int INT,
      ADD COLUMN IF NOT EXISTS candidate_id_uuid UUID,
      ALTER COLUMN submission_id DROP NOT NULL,
      ALTER COLUMN interview_date DROP NOT NULL,
      ALTER COLUMN interview_round DROP NOT NULL,
      ALTER COLUMN interview_mode DROP NOT NULL;
    `);
    console.log("Successfully altered interviews table.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}
run();
