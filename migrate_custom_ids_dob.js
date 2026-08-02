require('dotenv').config();
const pool = require('./config/db');

async function migrate() {
  console.log('🚀 Starting migration for custom IDs and DOB...');
  try {
    // Add candidate_code and dob to candidates table
    await pool.query(`
      ALTER TABLE candidates 
      ADD COLUMN IF NOT EXISTS candidate_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS dob DATE;
    `);
    console.log('✅ Added candidate_code and dob columns to candidates table');

    // Add company_code to companies table
    await pool.query(`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS company_code VARCHAR(50);
    `);
    console.log('✅ Added company_code column to companies table');

    // Add index for candidate_code and company_code
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_candidates_candidate_code ON candidates (candidate_code);
      CREATE INDEX IF NOT EXISTS idx_companies_company_code ON companies (company_code);
    `);
    console.log('✅ Created indexes for candidate_code and company_code');

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
