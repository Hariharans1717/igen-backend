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
    console.log("Connecting to DB to add Google Drive columns to candidates table...");
    await pool.query(`
      ALTER TABLE candidates 
      ADD COLUMN IF NOT EXISTS photo_url TEXT,
      ADD COLUMN IF NOT EXISTS resume_url TEXT,
      ADD COLUMN IF NOT EXISTS resume_filename VARCHAR(255);
    `);
    console.log("✅ Successfully altered candidates table (added photo_url, resume_url, resume_filename).");
  } catch (err) {
    console.error("❌ Error during migration:", err);
  } finally {
    await pool.end();
  }
}

run();
