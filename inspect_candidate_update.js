const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

async function inspectSchema() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='candidates'");
  console.log('📋 Existing columns in candidates table:');
  console.log(res.rows.map(x => x.column_name));
  process.exit(0);
}

inspectSchema();
