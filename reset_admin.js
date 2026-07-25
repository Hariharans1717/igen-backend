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

async function main() {
  try {
    const users = [
      { email: 'priya@igen.in', pass: 'igen@2025', name: 'Priya' },
      { email: 'igentracker@gmail.com', pass: 'igen@2026', name: 'IGen Tracker' }
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.pass, 10);
      const existing = await pool.query('SELECT id FROM hr_users WHERE email = $1', [u.email]);
      if (existing.rows.length > 0) {
        await pool.query('UPDATE hr_users SET password_hash = $1, is_active = true WHERE email = $2', [hash, u.email]);
        console.log(`✅ Updated account ${u.email} -> password: "${u.pass}"`);
      } else {
        await pool.query(
          `INSERT INTO hr_users (first_name, last_name, email, password_hash, role, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [u.name, 'Admin', u.email, hash, 'admin']
        );
        console.log(`✅ Created account ${u.email} -> password: "${u.pass}"`);
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
