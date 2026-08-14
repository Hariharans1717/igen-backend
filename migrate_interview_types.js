require('dotenv').config();
const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Starting migration to replace HR, Technical, Final with L1, L2, L3...');

    // 1. Update interview_type values
    const typeRes = await pool.query(`
      UPDATE interviews 
      SET interview_type = CASE 
        WHEN interview_type = 'HR' THEN 'L1'
        WHEN interview_type = 'Technical' THEN 'L2'
        WHEN interview_type = 'Final' THEN 'L3'
        ELSE interview_type 
      END
      WHERE interview_type IN ('HR', 'Technical', 'Final')
    `);
    console.log(`Updated ${typeRes.rowCount} rows in interviews (interview_type updated).`);

    // 2. Update exact matches in interview_round
    const roundRes = await pool.query(`
      UPDATE interviews 
      SET interview_round = CASE 
        WHEN interview_round = 'HR' THEN 'L1'
        WHEN interview_round = 'Technical' THEN 'L2'
        WHEN interview_round = 'Final' THEN 'L3'
        ELSE interview_round 
      END
      WHERE interview_round IN ('HR', 'Technical', 'Final')
    `);
    console.log(`Updated ${roundRes.rowCount} rows in interviews (interview_round exact matches updated).`);

    // 3. Update exact matches in title
    const titleRes = await pool.query(`
      UPDATE interviews 
      SET title = CASE 
        WHEN title = 'HR' THEN 'L1'
        WHEN title = 'Technical' THEN 'L2'
        WHEN title = 'Final' THEN 'L3'
        ELSE title 
      END
      WHERE title IN ('HR', 'Technical', 'Final')
    `);
    console.log(`Updated ${titleRes.rowCount} rows in interviews (title exact matches updated).`);

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
