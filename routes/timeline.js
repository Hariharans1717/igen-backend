// =========================================
// Timeline Routes — Read by Candidate
// =========================================
const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ---- Helper: Map DB row to frontend TimelineEvent shape ----
function mapTimelineEvent(row) {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    action: row.action,
    note: row.note || '',
    hrName: row.hr_name || 'System',
    relatedCompany: row.related_company || undefined,
    timestamp: row.created_at,
  };
}

// ---- GET /api/timeline/candidate/:candidateId ----
router.get('/candidate/:candidateId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ct.*,
        CONCAT(u.first_name, ' ', u.last_name) AS hr_name
       FROM candidate_timeline ct
       LEFT JOIN hr_users u ON u.id = ct.hr_user_id
       WHERE ct.candidate_id = $1
       ORDER BY ct.created_at DESC`,
      [req.params.candidateId]
    );

    res.json(result.rows.map(mapTimelineEvent));
  } catch (err) {
    console.error('Get timeline error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
