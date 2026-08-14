require('dotenv').config();
const pool = require('./config/db');


async function fixHqs() {
  try {
    const res = await pool.query(`
      WITH ranked AS (
        SELECT branch_id, company_id,
               ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) as rn
        FROM branches
        WHERE is_headquarters = TRUE
      )
      UPDATE branches
      SET is_headquarters = FALSE
      WHERE branch_id IN (
        SELECT branch_id FROM ranked WHERE rn > 1
      )
      RETURNING branch_id;
    `);
    console.log('Fixed duplicate HQs count:', res.rowCount);

    // Ensure every company has at least 1 HQ if branches exist
    const noHqRes = await pool.query(`
      WITH no_hq AS (
        SELECT c.company_id
        FROM companies c
        JOIN branches b ON b.company_id = c.company_id
        GROUP BY c.company_id
        HAVING COUNT(CASE WHEN b.is_headquarters THEN 1 END) = 0
      ),
      first_branch AS (
        SELECT b.branch_id,
               ROW_NUMBER() OVER (PARTITION BY b.company_id ORDER BY b.created_at ASC) as rn
        FROM branches b
        JOIN no_hq nh ON nh.company_id = b.company_id
      )
      UPDATE branches
      SET is_headquarters = TRUE
      WHERE branch_id IN (
        SELECT branch_id FROM first_branch WHERE rn = 1
      );
    `);
    console.log('Set default HQ for companies without HQ count:', noHqRes.rowCount);

    process.exit(0);
  } catch (err) {
    console.error('Error fixing HQs:', err);
    process.exit(1);
  }
}

fixHqs();
