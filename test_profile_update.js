const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');
const candidateService = require('./services/candidateService');

async function testCandidateProfileUpdate() {
  console.log('🧪 Testing Candidate Profile Update...');
  try {
    // 1. Create a candidate
    const initial = await candidateService.createCandidate({
      name: 'Initial Candidate Name',
      email: `initial.${Date.now()}@example.com`,
      mobile: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
      employmentStatus: 'employed',
      currentCompany: 'Old Company',
      currentDesignation: 'Junior Dev',
      currentCTC: 500000,
      currentCurrency: 'INR',
      expectedCTC: 800000,
      expectedCurrency: 'INR',
      experience: 2,
      preferredLocation: 'Chennai',
      skills: ['JavaScript'],
      status: 'active'
    }, null);

    console.log('✅ Candidate Created ID:', initial.id);

    // 2. Perform Profile Edit / Update
    console.log('\n✏️ Updating Candidate Profile Details...');
    const updateData = {
      name: 'Updated Candidate Name',
      currentCompany: 'New Global Tech Inc',
      currentDesignation: 'Lead Architect',
      department: 'Engineering & AI',
      currentCTC: 1500000,
      currentCurrency: 'USD',
      expectedCTC: 2200000,
      expectedCurrency: 'USD',
      experience: 6,
      preferredLocation: 'Remote',
      skills: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
      aadhaarNumber: '9876-5432-1098',
      panNumber: 'XYZAB9876C',
      noticePeriod: '30 Days',
      currentLocation: 'Bangalore',
      remarks: 'Top tier candidate with excellent design skills'
    };

    const updatedCandidate = await candidateService.updateCandidate(initial.id, updateData, null);

    console.log('\n✅ Profile Update Result:');
    console.log('   Name:', updatedCandidate.name);
    console.log('   Current Company:', updatedCandidate.currentCompany);
    console.log('   Current Designation:', updatedCandidate.currentDesignation);
    console.log('   Department:', updatedCandidate.department);
    console.log('   Current CTC:', updatedCandidate.currentCTC, updatedCandidate.currentCurrency);
    console.log('   Expected CTC:', updatedCandidate.expectedCTC, updatedCandidate.expectedCurrency);
    console.log('   Experience:', updatedCandidate.experience);
    console.log('   Aadhaar Masked:', updatedCandidate.aadhaarMasked);
    console.log('   PAN Number:', updatedCandidate.panNumber);
    console.log('   Notice Period:', updatedCandidate.noticePeriod);
    console.log('   Current Location:', updatedCandidate.currentLocation);
    console.log('   Remarks:', updatedCandidate.remarks);

    // 3. Verify directly from database
    const dbRes = await pool.query('SELECT * FROM candidates WHERE id = $1', [initial.id]);
    const dbRow = dbRes.rows[0];
    console.log('\n🗄️ Database Row Verification:');
    console.log('   db.name:', dbRow.name);
    console.log('   db.current_company:', dbRow.current_company);
    console.log('   db.current_designation:', dbRow.current_designation);
    console.log('   db.department:', dbRow.department);
    console.log('   db.aadhaar_number:', dbRow.aadhaar_number);
    console.log('   db.pan_number:', dbRow.pan_number);
    console.log('   db.notice_period:', dbRow.notice_period);
    console.log('   db.remarks:', dbRow.remarks);

    // Cleanup
    await pool.query('DELETE FROM candidates WHERE id = $1', [initial.id]);
    console.log('\n🧹 Cleaned up test candidate.');

    console.log('\n🎉 CANDIDATE PROFILE UPDATE VERIFICATION PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Profile update test failed:', err);
    process.exit(1);
  }
}

testCandidateProfileUpdate();
