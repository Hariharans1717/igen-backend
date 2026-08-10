const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

async function runMigration() {
  console.log('🚀 Running Per-Company Pipeline Migration...');
  try {
    // 1. Create candidate_company_pipeline table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidate_company_pipeline (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
        company_name VARCHAR(100) NOT NULL,
        branch_id UUID REFERENCES branches(branch_id) ON DELETE SET NULL,
        interview_status VARCHAR(60) NOT NULL DEFAULT 'awaiting_schedule',
        sub_status VARCHAR(60),
        status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(candidate_id, company_name)
      );
    `);
    console.log('✅ Created candidate_company_pipeline table');

    // 2. Add company_name to candidate_status_history if missing
    await pool.query(`
      ALTER TABLE candidate_status_history
        ADD COLUMN IF NOT EXISTS company_name VARCHAR(100);
    `);
    console.log('✅ Updated candidate_status_history table with company_name');

    // 3. Seed candidate_company_pipeline from interviews table
    await pool.query(`
      INSERT INTO candidate_company_pipeline (candidate_id, company_id, company_name, interview_status, created_at, updated_at)
      SELECT DISTINCT ON (c.id, COALESCE(NULLIF(co.company_name, ''), c.current_company, 'General'))
        c.id AS candidate_id,
        iv.company_id,
        COALESCE(NULLIF(co.company_name, ''), c.current_company, 'General') AS company_name,
        c.status AS interview_status,
        NOW(),
        NOW()
      FROM candidates c
      LEFT JOIN interviews iv ON iv.candidate_id_uuid = c.id
      LEFT JOIN companies co ON co.company_id = iv.company_id
      WHERE c.status != 'inactive'
      ON CONFLICT (candidate_id, company_name) DO NOTHING;
    `);
    console.log('✅ Seeded candidate_company_pipeline table');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
