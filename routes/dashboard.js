// =========================================
// Dashboard Routes — KPIs & Analytics
// =========================================
const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ---- GET /api/dashboard/kpis ----
router.get('/kpis', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status != 'inactive') AS total_candidates,
        COUNT(*) FILTER (WHERE status IN ('active','submitted','on_hold')) AS active_pipeline,
        COUNT(*) FILTER (WHERE status = 'active') AS interview_scheduled,
        COUNT(*) FILTER (WHERE status = 'on_hold' AND EXISTS (
          SELECT 1 FROM candidate_submissions cs WHERE cs.candidate_id = candidates.id AND cs.status = 'offered'
        )) AS offered,
        COUNT(*) FILTER (WHERE status = 'joined') AS joined,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
        COUNT(*) FILTER (WHERE status = 'active') AS follow_up_required,
        COUNT(*) FILTER (WHERE status = 'not_reachable') AS not_reachable,
        COUNT(*) FILTER (WHERE status = 'on_hold') AS on_hold
      FROM candidates
    `);

    const row = result.rows[0];

    res.json({
      totalCandidates: parseInt(row.total_candidates, 10),
      activePipeline: parseInt(row.active_pipeline, 10),
      interviewScheduled: parseInt(row.interview_scheduled, 10),
      offered: parseInt(row.offered, 10),
      joined: parseInt(row.joined, 10),
      rejected: parseInt(row.rejected, 10),
      followUpRequired: parseInt(row.follow_up_required, 10),
      notReachable: parseInt(row.not_reachable, 10),
      onHold: parseInt(row.on_hold, 10),
    });
  } catch (err) {
    console.error('Get KPIs error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- GET /api/dashboard/recruiter-performance ----
router.get('/recruiter-performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        CONCAT(u.first_name, ' ', u.last_name) AS name,
        (SELECT COUNT(*) FROM candidate_submissions cs WHERE cs.submitted_by = u.id) AS submissions,
        (SELECT COUNT(*) FROM interviews iv
         JOIN candidate_submissions cs ON cs.id = iv.submission_id
         WHERE cs.submitted_by = u.id) AS interviews,
        (SELECT COUNT(*) FROM candidate_submissions cs
         WHERE cs.submitted_by = u.id AND cs.status IN ('offered', 'joined')) AS offers,
        (SELECT COUNT(*) FROM candidate_submissions cs
         WHERE cs.submitted_by = u.id AND cs.status = 'joined') AS joins
      FROM hr_users u
      WHERE u.is_active = true
      ORDER BY u.first_name
    `);

    res.json(result.rows.map(row => ({
      name: row.name,
      submissions: parseInt(row.submissions, 10),
      interviews: parseInt(row.interviews, 10),
      offers: parseInt(row.offers, 10),
      joins: parseInt(row.joins, 10),
    })));
  } catch (err) {
    console.error('Get recruiter performance error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- GET /api/dashboard/company-hiring ----
router.get('/company-hiring', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        cs.client_company AS company,
        COUNT(*) AS submissions,
        COUNT(DISTINCT iv.id) AS interviews,
        COUNT(*) FILTER (WHERE cs.status IN ('offered', 'joined')) AS offers,
        COUNT(*) FILTER (WHERE cs.status = 'joined') AS joins
      FROM candidate_submissions cs
      LEFT JOIN interviews iv ON iv.submission_id = cs.id
      GROUP BY cs.client_company
      ORDER BY submissions DESC
    `);

    res.json(result.rows.map(row => ({
      company: row.company,
      submissions: parseInt(row.submissions, 10),
      interviews: parseInt(row.interviews, 10),
      offers: parseInt(row.offers, 10),
      joins: parseInt(row.joins, 10),
    })));
  } catch (err) {
    console.error('Get company hiring error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- GET /api/dashboard/monthly-trends ----
router.get('/monthly-trends', async (req, res) => {
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const submissionsResult = await pool.query(`
      SELECT EXTRACT(MONTH FROM submission_date) AS month, COUNT(*) AS count
      FROM candidate_submissions
      GROUP BY EXTRACT(MONTH FROM submission_date)
    `);

    const interviewsResult = await pool.query(`
      SELECT EXTRACT(MONTH FROM interview_date) AS month, COUNT(*) AS count
      FROM interviews
      GROUP BY EXTRACT(MONTH FROM interview_date)
    `);

    const offersResult = await pool.query(`
      SELECT EXTRACT(MONTH FROM created_at) AS month, COUNT(*) AS count
      FROM candidate_submissions
      WHERE status IN ('offered', 'joined')
      GROUP BY EXTRACT(MONTH FROM created_at)
    `);

    const joinsResult = await pool.query(`
      SELECT EXTRACT(MONTH FROM created_at) AS month, COUNT(*) AS count
      FROM candidate_submissions
      WHERE status = 'joined'
      GROUP BY EXTRACT(MONTH FROM created_at)
    `);

    // Build lookup maps
    const toMap = (rows) => {
      const map = {};
      rows.forEach(r => { map[parseInt(r.month, 10)] = parseInt(r.count, 10); });
      return map;
    };

    const subMap = toMap(submissionsResult.rows);
    const ivMap = toMap(interviewsResult.rows);
    const offerMap = toMap(offersResult.rows);
    const joinMap = toMap(joinsResult.rows);

    const trends = months.map((m, i) => ({
      month: m,
      submissions: subMap[i + 1] || 0,
      interviews: ivMap[i + 1] || 0,
      offers: offerMap[i + 1] || 0,
      joins: joinMap[i + 1] || 0,
    }));

    res.json(trends);
  } catch (err) {
    console.error('Get monthly trends error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
