// =========================================
// Submission Routes — CRUD + Duplicate Check
// =========================================
const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ---- Helper: Map DB row to frontend CandidateSubmission shape ----
function mapSubmission(row) {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    candidateName: row.candidate_name || '',
    companyName: row.client_company,
    submissionDate: row.submission_date,
    recruiterId: row.submitted_by,
    recruiterName: row.recruiter_name || '',
    status: row.status,
    offerCTC: row.offer_ctc ? parseFloat(row.offer_ctc) : undefined,
    joiningDate: row.joining_date || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Common join query for getting candidate and recruiter names
const SUBMISSION_SELECT = `
  SELECT cs.*,
    c.name AS candidate_name,
    CONCAT(u.first_name, ' ', u.last_name) AS recruiter_name
  FROM candidate_submissions cs
  LEFT JOIN candidates c ON c.id = cs.candidate_id
  LEFT JOIN hr_users u ON u.id = cs.submitted_by
`;

// ---- GET /api/submissions ----
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search } = req.query;
    const pageNum = parseInt(page, 10);
    const size = parseInt(pageSize, 10);
    const offset = (pageNum - 1) * size;

    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClause = `WHERE (c.name ILIKE $${paramIndex} OR cs.client_company ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM candidate_submissions cs
       LEFT JOIN candidates c ON c.id = cs.candidate_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `${SUBMISSION_SELECT} ${whereClause}
       ORDER BY cs.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, size, offset]
    );

    res.json({
      data: dataResult.rows.map(mapSubmission),
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    });
  } catch (err) {
    console.error('Get submissions error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- GET /api/submissions/candidate/:candidateId ----
router.get('/candidate/:candidateId', async (req, res) => {
  try {
    const result = await pool.query(
      `${SUBMISSION_SELECT} WHERE cs.candidate_id = $1 ORDER BY cs.created_at DESC`,
      [req.params.candidateId]
    );

    res.json(result.rows.map(mapSubmission));
  } catch (err) {
    console.error('Get candidate submissions error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- POST /api/submissions ----
router.post('/', async (req, res) => {
  try {
    const { candidateId, companyName, submissionDate, status, notes } = req.body;

    if (!candidateId || !companyName) {
      return res.status(400).json({ error: 'candidateId and companyName are required.' });
    }

    const result = await pool.query(
      `INSERT INTO candidate_submissions (candidate_id, client_company, submitted_by, submission_date, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [candidateId, companyName, req.user.id, submissionDate || new Date().toISOString().split('T')[0], status || 'submitted']
    );

    const submission = result.rows[0];

    // Get candidate name and recruiter name for the response
    const enriched = await pool.query(
      `${SUBMISSION_SELECT} WHERE cs.id = $1`,
      [submission.id]
    );

    // Add timeline entry
    const recruiterName = `${req.user.email}`;
    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note, related_company)
       VALUES ($1, $2, $3, $4, $5)`,
      [candidateId, req.user.id, `Submitted to ${companyName}`, `Resume submitted`, companyName]
    );

    res.status(201).json(mapSubmission(enriched.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This candidate has already been submitted to this company.' });
    }
    console.error('Create submission error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- POST /api/submissions/check-duplicate ----
router.post('/check-duplicate', async (req, res) => {
  try {
    const { candidateId, companyName } = req.body;

    if (!candidateId || !companyName) {
      return res.status(400).json({ error: 'candidateId and companyName are required.' });
    }

    const result = await pool.query(
      'SELECT id FROM candidate_submissions WHERE candidate_id = $1 AND client_company = $2',
      [candidateId, companyName]
    );

    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error('Check submission duplicate error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
