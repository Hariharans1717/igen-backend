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
    console.log("Connecting to DB...");
    await pool.query(`
      ALTER TABLE interviews 
      ADD COLUMN IF NOT EXISTS interviewer_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS interview_time TIME,
      ADD COLUMN IF NOT EXISTS interview_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    `);
    console.log("Successfully altered interviews table.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
