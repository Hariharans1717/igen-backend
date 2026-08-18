require('dotenv').config({ path: '.env' });
const pool = require('./config/db');
const { createCandidate } = require('./services/candidateService');

(async () => {
  try {
    await pool.query("SELECT setval('candidate_id_seq', 999, true)");
    const userRes = await pool.query('SELECT id FROM hr_users LIMIT 1');
    const userId = userRes.rows[0].id;
    const res = await createCandidate({
      name: 'Test Boundary',
      email: 'boundary2@test.com',
      mobile: '9991112224',
      employmentStatus: 'unemployed',
      expectedCTC: 12,
      preferredLocation: 'Chennai',
      skills: ['Node.js'],
      status: 'awaiting_interview',
      currentCurrency: 'INR',
      expectedCurrency: 'INR'
    }, userId);
    console.log('Created ID:', res.id);
    console.log('Created Code:', res.candidate_code);
  } catch(e) {
    console.error('Create Error:', e);
  }
  process.exit(0);
})();
