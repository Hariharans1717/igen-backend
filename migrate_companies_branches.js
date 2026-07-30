const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

async function runMigration() {
  console.log('🚀 Running Companies & Branches Migration...');
  try {
    // 1. Create companies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        company_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created companies table');

    // 2. Create branches table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS branches (
        branch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        branch_name VARCHAR(100) NOT NULL,
        city VARCHAR(100),
        is_headquarters BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, branch_name)
      );
    `);
    console.log('✅ Created branches table');

    // 3. Alter interviews table to reference company_id and branch_id
    await pool.query(`
      ALTER TABLE interviews 
        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(branch_id) ON DELETE SET NULL;
    `);
    console.log('✅ Altered interviews table with company_id & branch_id');

    console.log('🎉 Migration finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
