require('dotenv').config();
const pool = require('./config/db');

async function testConnection() {
  try {
    const columns = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'candidate_submissions'
    `);
    console.log('Columns in candidate_submissions table:', columns.rows);
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    await pool.end();
  }
}

testConnection();
