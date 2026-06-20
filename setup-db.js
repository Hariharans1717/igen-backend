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

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
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
