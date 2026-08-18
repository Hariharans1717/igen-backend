require('dotenv').config({ path: '.env' });
const pool = require('./config/db');

(async () => {
  const res = await pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'candidates' AND column_name IN ('preferred_location', 'skills', 'expected_ctc')");
  console.log(res.rows);
  process.exit(0);
})();
