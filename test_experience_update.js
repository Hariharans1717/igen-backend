const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');
const candidateService = require('./services/candidateService');

async function testExperienceUpdate() {
  console.log('🧪 Testing Experience Field Update...');
  try {
    // 1. Create candidate with 2 years experience
    const candidate = await candidateService.createCandidate({
      name: 'Experience Test Candidate',
      email: `exp.${Date.now()}@example.com`,
      mobile: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
      employmentStatus: 'employed',
      currentCompany: 'AvoSoft',
      currentDesignation: 'Developer',
      expectedCTC: 900000,
      experience: 2,
      preferredLocation: 'Covai',
      skills: ['React', 'Node'],
      status: 'active'
    }, null);

    console.log('✅ Candidate Created with initial Experience:', candidate.experience, 'Years');

    // 2. Update Experience to 5 Years
    console.log('✏️ Updating Experience to 5 Years...');
    const updated = await candidateService.updateCandidate(candidate.id, {
      experience: 5
    }, null);

    console.log('✅ Updated Candidate Experience:', updated.experience, 'Years');

    // 3. Query PostgreSQL directly
    const dbRes = await pool.query('SELECT experience_years FROM candidates WHERE id = $1', [candidate.id]);
    console.log('🗄️ PostgreSQL experience_years column:', dbRes.rows[0].experience_years);

    // Cleanup
    await pool.query('DELETE FROM candidates WHERE id = $1', [candidate.id]);
    console.log('🧹 Cleaned up test candidate.');

    if (parseFloat(dbRes.rows[0].experience_years) === 5 && updated.experience === 5) {
      console.log('🎉 EXPERIENCE UPDATE TEST PASSED PERFECTLY!');
      process.exit(0);
    } else {
      console.error('❌ Experience update mismatch!');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test error:', err);
    process.exit(1);
  }
}

testExperienceUpdate();
