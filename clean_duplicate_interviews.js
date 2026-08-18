const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

async function cleanDuplicates() {
  try {
    console.log('🔍 Checking for duplicate interviews...');

    // Find all interviews for Hariharan S
    const res = await pool.query(`
      SELECT iv.id, iv.title, iv.interview_round, iv.interview_date, iv.result, iv.created_at, c.name AS candidate_name
      FROM interviews iv
      JOIN candidates c ON c.id = iv.candidate_id_uuid
      ORDER BY c.name, iv.title, iv.created_at ASC
    `);

    console.log(`Found ${res.rows.length} total interviews.`);
    res.rows.forEach(r => {
      console.log(`- [${r.id}] Candidate: ${r.candidate_name} | Title: ${r.title} | Date: ${r.interview_date} | Result: ${r.result} | Created: ${r.created_at}`);
    });

    // Delete interviews created by handleStatusUpdate where company_id is NULL and interview_date is 'Awaiting Schedule' or default and title in ('L3 Interview', 'L2 Interview', 'L1 Interview', 'Interview') without feedback/notes
    const deleteRes = await pool.query(`
      DELETE FROM interviews
      WHERE company_id IS NULL
        AND (interview_feedback IS NULL OR interview_feedback = '')
        AND (recruiter_notes IS NULL OR recruiter_notes = '')
        AND (title IN ('L3 Interview', 'L2 Interview', 'L1 Interview', 'Interview', 'Final Round') OR interview_round IN ('L3 Interview', 'L2 Interview', 'L1 Interview', 'Interview', 'Final Round'))
      RETURNING id, title, candidate_name;
    `);

    console.log(`✅ Cleaned up ${deleteRes.rows.length} duplicate/auto-generated interview records.`);
    deleteRes.rows.forEach(d => console.log(`Deleted interview: [${d.id}] ${d.title}`));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error cleaning duplicates:', err);
    process.exit(1);
  }
}

cleanDuplicates();
