const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const pool = require('./config/db');

async function checkAndFix() {
  try {
    const candRes = await pool.query(
      `SELECT id, name, current_company, employment_status FROM candidates
       WHERE LOWER(current_company) LIKE '%free%' OR LOWER(current_company) LIKE '%laun%'`
    );
    console.log('Candidates matching freelauncer/freelancer:', candRes.rows);

    const pipeRes = await pool.query(
      `SELECT * FROM candidate_company_pipeline
       WHERE LOWER(company_name) LIKE '%free%' OR LOWER(company_name) LIKE '%laun%'`
    );
    console.log('Pipelines matching freelauncer/freelancer:', pipeRes.rows);

    const intRes = await pool.query(
      `SELECT id, candidate_id_uuid, company_id FROM interviews`
    );
    console.log('Total interviews count:', intRes.rows.length);

    // Update candidate_company_pipeline if company_name is freelauncer / freelancer
    await pool.query(
      `UPDATE candidate_company_pipeline
       SET company_name = 'Candidate Pipeline'
       WHERE LOWER(company_name) IN ('freelancer', 'freelauncer', 'freelance', 'unemployed', 'n/a', 'general')`
    );

    // Update candidates current_company if freelauncer / freelancer / typo
    await pool.query(
      `UPDATE candidates
       SET current_company = NULL
       WHERE LOWER(current_company) IN ('freelancer', 'freelauncer', 'freelance', 'unemployed', 'none', 'n/a')`
    );

    console.log('✅ Updated database records cleanly!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAndFix();
