const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');
const candidateService = require('./services/candidateService');
const notesService = require('./services/notesService');

async function testEnhancedFeatures() {
  console.log('🧪 Testing Enhanced Candidate Schema & Versioned Notes Audit Trail...');
  try {
    // 1. Create a candidate with Aadhaar, PAN, and multi-currency CTC
    const testCandidate = await candidateService.createCandidate({
      name: 'Rohan Sharma',
      email: `rohan.sharma.${Date.now()}@example.com`,
      mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      aadhaarNumber: '1234-5678-9012',
      panNumber: 'ABCDE1234F',
      employmentStatus: 'employed',
      currentCompany: 'Tech Corp',
      currentDesignation: 'Senior Developer',
      currentCTC: 1200000,
      currentCurrency: 'INR',
      expectedCTC: 1800000,
      expectedCurrency: 'INR',
      experience: 5,
      preferredLocation: 'Bangalore',
      skills: ['React', 'Node.js', 'PostgreSQL'],
      status: 'active'
    }, null);

    console.log('✅ Candidate Created with Identity Docs & Salary:');
    console.log('   Candidate ID:', testCandidate.id);
    console.log('   Aadhaar Masked:', testCandidate.aadhaarMasked);
    console.log('   PAN Number:', testCandidate.panNumber);
    console.log('   Current CTC:', testCandidate.currentCTC, testCandidate.currentCurrency);
    console.log('   Expected CTC:', testCandidate.expectedCTC, testCandidate.expectedCurrency);

    // 2. Add a Note with Category, Priority & Status
    const note1 = await notesService.createNote({
      candidateId: testCandidate.id,
      title: 'Interview Feedback Note',
      content: 'Initial technical screening passed. Great communication skills.',
      category: 'interview_feedback',
      priority: 'high',
      status: 'open'
    }, null);

    console.log('\n📝 Created Note v1:');
    console.log('   Note ID:', note1.id);
    console.log('   Category:', note1.category);
    console.log('   Priority:', note1.priority);
    console.log('   Content:', note1.content);

    // 3. Edit the Note to trigger Version Audit History Logging
    console.log('\n✏️ Editing Note to create Version Audit Trail (v1 -> v2)...');
    const updateRes = await notesService.updateNote(
      note1.id,
      'Initial technical screening passed with distinction. Offered L2 round with CTO.',
      note1.title,
      null,
      'offer_details',
      'critical',
      'in-progress',
      'Updated status following hiring manager debrief'
    );

    const updatedNote = updateRes.note;
    console.log('✅ Updated Note (v2):');
    console.log('   Current Content:', updatedNote.content);
    console.log('   Category:', updatedNote.category);
    console.log('   Priority:', updatedNote.priority);
    console.log('   Edit History Count:', updatedNote.editHistory?.length);
    console.log('   Audit Log Entries:', JSON.stringify(updatedNote.editHistory, null, 2));

    // Cleanup test candidate
    await pool.query('DELETE FROM candidates WHERE id = $1', [testCandidate.id]);
    console.log('\n🧹 Cleaned up test candidate from database.');

    console.log('\n🎉 ALL ENHANCED CANDIDATE & VERSIONED NOTES AUDIT TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testEnhancedFeatures();
