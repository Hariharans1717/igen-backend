/**
 * Database Setup Script
 * - Runs schema.sql to create all tables, enums, indexes, and triggers
 * - Seeds an initial admin user
 * 
 * Usage: node setup-db.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const useSSL = process.env.DB_SSL === 'true' || Boolean(process.env.DATABASE_URL) || (process.env.DB_HOST && process.env.DB_HOST.includes('render.com'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
  port: process.env.DATABASE_URL ? undefined : (parseInt(process.env.DB_PORT, 10) || 5432),
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
  user: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

async function run() {
  try {
    // Step 1: Test connection
    console.log('🔌 Connecting to database...');
    const connTest = await pool.query('SELECT NOW()');
    console.log(`✅ Connected! Server time: ${connTest.rows[0].now}\n`);

    // Step 2: Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    console.log(`📄 Reading schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('🏗️  Creating tables, enums, indexes, and triggers...');
    await pool.query(schemaSql);
    console.log('✅ Schema executed successfully!\n');

    // Keep the database compatible with public candidate registration, where
    // optional profile fields may be omitted.
    await pool.query(`
      ALTER TABLE candidates
        ADD COLUMN IF NOT EXISTS is_accessed BOOLEAN DEFAULT FALSE;
      ALTER TABLE candidates
        ALTER COLUMN expected_ctc DROP NOT NULL,
        ALTER COLUMN preferred_location DROP NOT NULL,
        ALTER COLUMN skills DROP NOT NULL,
        ALTER COLUMN skills SET DEFAULT '{}',
        ALTER COLUMN employment_status DROP NOT NULL,
        ALTER COLUMN employment_status SET DEFAULT 'unemployed';
      ALTER TABLE candidate_salary
        ALTER COLUMN expected_ctc DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS expected_hike_percent NUMERIC(5,2);
      ALTER TABLE candidate_documents
        ALTER COLUMN aadhaar_encrypted DROP NOT NULL,
        ALTER COLUMN pan_number DROP NOT NULL;
    `);
    console.log('✅ Candidate registration compatibility applied!\n');

    const duplicateCompanyCodes = await pool.query(`
      SELECT company_id, company_code
      FROM (
        SELECT company_id, company_code, created_at,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(company_code))
            ORDER BY created_at ASC, company_id ASC
          ) AS duplicate_rank
        FROM companies
        WHERE company_code IS NOT NULL AND TRIM(company_code) <> ''
      ) ranked
      WHERE duplicate_rank > 1
      ORDER BY LOWER(TRIM(company_code)), created_at, company_id
    `);

    for (const duplicate of duplicateCompanyCodes.rows) {
      const currentCode = duplicate.company_code.trim().toUpperCase();
      const match = currentCode.match(/^(.+?)(\d+)$/);
      const prefix = match ? match[1] : currentCode;
      let suffix = match ? Number(match[2]) + 1 : 1001;
      let uniqueCode;

      while (true) {
        uniqueCode = `${prefix}${suffix}`;
        const conflict = await pool.query(
          `SELECT 1 FROM companies WHERE LOWER(TRIM(company_code)) = LOWER($1) LIMIT 1`,
          [uniqueCode]
        );
        if (conflict.rows.length === 0) break;
        suffix += 1;
      }

      await pool.query(
        `UPDATE companies SET company_code = $1 WHERE company_id = $2`,
        [uniqueCode, duplicate.company_id]
      );
      console.log(`✅ Reassigned duplicate company code ${currentCode} to ${uniqueCode}`);
    }

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_company_code_unique
      ON companies (LOWER(TRIM(company_code)))
      WHERE company_code IS NOT NULL AND TRIM(company_code) <> ''
    `);
    console.log('✅ Company codes are now unique (case-insensitive)\n');

    const maxCandidateCodeResult = await pool.query(`
      SELECT MAX(CAST(SUBSTRING(candidate_code FROM 3) AS BIGINT)) AS max_number
      FROM candidates
      WHERE candidate_code ~ '^IG[0-9]+$'
    `);
    const nextCandidateNumber = Number(maxCandidateCodeResult.rows[0].max_number || 0) + 1;
    await pool.query("SELECT setval('candidate_id_seq', $1, false)", [nextCandidateNumber]);
    console.log(`✅ Candidate ID sequence initialized at IG${String(nextCandidateNumber).padStart(4, '0')}\n`);

    // Step 3: Verify tables were created
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('📋 Tables created:');
    tables.rows.forEach(row => console.log(`   ✅ ${row.table_name}`));
    console.log('');

    // Step 4: Seed admin user
    console.log('👤 Seeding admin user...');
    const adminEmail = 'priya@igen.in';
    const adminPassword = 'igen@2025';
    
    const existing = await pool.query('SELECT id FROM hr_users WHERE email = $1', [adminEmail]);
    if (existing.rows.length > 0) {
      console.log(`   ⚠️  Admin user (${adminEmail}) already exists. Skipping.\n`);
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        `INSERT INTO hr_users (first_name, last_name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        ['Priya', 'Admin', adminEmail, passwordHash, 'admin']
      );
      console.log(`   ✅ Admin user created!`);
      console.log(`      Email:    ${adminEmail}`);
      console.log(`      Password: ${adminPassword}`);
      console.log(`      Role:     admin\n`);
    }

    console.log('🎉 Database setup complete! You can now start the server.');

  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
