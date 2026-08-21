require('dotenv').config();
const pool = require('./config/db');

async function updateEnum() {
  const newValues = [
    'next_round', 'awaiting_interview', 'awaiting_schedule', 'l1_awaiting_schedule', 'l1_scheduled', 'awaiting_result', 'l1_awaiting_result', 'l1_reject', 'l2_awaiting_schedule', 'l2_scheduled', 'l2_awaiting_result', 'l2_reject', 'l3_awaiting_schedule', 'l3_scheduled', 'l3_awaiting_result', 'l3_reject', 'final_select', 'candidate_declined', 'awaiting_verification', 'verification_reject', 'deployed'
  ];
  
  for (const val of newValues) {
    try {
      await pool.query(`ALTER TYPE interview_result_enum ADD VALUE IF NOT EXISTS '${val}';`);
      console.log(`Added ${val}`);
    } catch(e) {
      console.log(`Failed or already exists: ${val} - ${e.message}`);
    }
  }
  process.exit(0);
}

updateEnum();
