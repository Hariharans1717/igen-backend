const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

async function runMigration() {
  console.log('🚀 Running Enhanced Candidate Schema Migration...');
  try {
    // 1. Alter candidates table to include direct identity and currency columns
    await pool.query(`
      ALTER TABLE candidates 
        ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(255),
        ADD COLUMN IF NOT EXISTS aadhaar_last4 VARCHAR(4),
        ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10),
        ADD COLUMN IF NOT EXISTS current_currency VARCHAR(3) DEFAULT 'INR',
        ADD COLUMN IF NOT EXISTS expected_currency VARCHAR(3) DEFAULT 'INR';
    `);
    console.log('✅ Altered candidates table with identity & currency columns');

    // 2. Create candidate_documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidate_documents (
        doc_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        aadhaar_encrypted VARCHAR(255) NOT NULL,
        aadhaar_last4 VARCHAR(4),
        pan_number VARCHAR(10) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(candidate_id)
      );
    `);
    console.log('✅ Created candidate_documents table');

    // 3. Create candidate_salary table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidate_salary (
        salary_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        current_ctc NUMERIC(12, 2),
        current_currency VARCHAR(3) DEFAULT 'INR',
        expected_ctc NUMERIC(12, 2) NOT NULL,
        expected_currency VARCHAR(3) DEFAULT 'INR',
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(candidate_id)
      );
    `);
    console.log('✅ Created candidate_salary table');

    // 4. Create candidate_offers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidate_offers (
        offer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL,
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        status VARCHAR(20) DEFAULT 'pending',
        offer_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expiry_date TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created candidate_offers table');

    // 5. Update candidate_notes table with category, priority, status, tags, updated_by
    await pool.query(`
      ALTER TABLE candidate_notes
        ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'personal_note',
        ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open',
        ADD COLUMN IF NOT EXISTS tags TEXT[],
        ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
    `);
    console.log('✅ Altered candidate_notes table');

    // 6. Create note_edit_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS note_edit_history (
        edit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        note_id UUID NOT NULL REFERENCES candidate_notes(id) ON DELETE CASCADE,
        version INT NOT NULL,
        previous_content TEXT NOT NULL,
        edited_by VARCHAR(100) NOT NULL DEFAULT 'You',
        edited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        change_reason TEXT
      );
    `);
    console.log('✅ Created note_edit_history table');

    // 7. Create Indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_salary_candidate ON candidate_salary(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_notes_candidate ON candidate_notes(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_notes_category ON candidate_notes(category);
      CREATE INDEX IF NOT EXISTS idx_notes_priority ON candidate_notes(priority);
      CREATE INDEX IF NOT EXISTS idx_edit_history_note ON note_edit_history(note_id);
      CREATE INDEX IF NOT EXISTS idx_offers_candidate ON candidate_offers(candidate_id);
    `);
    console.log('✅ Created performance indexes');

    console.log('🎉 Enhanced candidate migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
