// =========================================
// Interview Routes — CRUD
// =========================================
const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ---- Helper: Map DB row to frontend Interview shape ----
function mapInterview(row) {
  return {
    id: row.id,
    submissionId: row.submission_id,
    candidateId: row.candidate_id || '',
    candidateName: row.candidate_name || '',
    companyName: row.company_name || '',
    resumeSubmissionDate: row.resume_submission_date || '',
    interviewDate: row.interview_date,
    interviewTime: row.interview_time || '',
    round: row.interview_round,
    mode: row.interview_mode === 'in_person' ? 'offline' :
          row.interview_mode === 'virtual' ? 'online' :
          row.interview_mode === 'telephone' ? 'telephonic' : row.interview_mode,
    feedback: row.interview_feedback || undefined,
    result: row.result,
    offeredCTC: row.offered_ctc ? parseFloat(row.offered_ctc) : undefined,
    offerStatus: row.offer_status || undefined,
    joiningDate: row.joining_date || undefined,
    recruiterNotes: row.recruiter_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Common join query
const INTERVIEW_SELECT = `
  SELECT iv.*,
    cs.candidate_id,
    c.name AS candidate_name,
    cs.client_company AS company_name,
    cs.submission_date AS resume_submission_date,
    TO_CHAR(iv.interview_date, 'HH24:MI') AS interview_time
  FROM interviews iv
  LEFT JOIN candidate_submissions cs ON cs.id = iv.submission_id
  LEFT JOIN candidates c ON c.id = cs.candidate_id
`;

// ---- GET /api/interviews ----
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
      whereClause = `WHERE (c.name ILIKE $${paramIndex} OR cs.client_company ILIKE $${paramIndex} OR iv.interview_round ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM interviews iv
       LEFT JOIN candidate_submissions cs ON cs.id = iv.submission_id
       LEFT JOIN candidates c ON c.id = cs.candidate_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `${INTERVIEW_SELECT} ${whereClause}
       ORDER BY iv.interview_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, size, offset]
    );

    res.json({
      data: dataResult.rows.map(mapInterview),
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    });
  } catch (err) {
    console.error('Get interviews error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- GET /api/interviews/candidate/:candidateId ----
router.get('/candidate/:candidateId', async (req, res) => {
  try {
    const result = await pool.query(
      `${INTERVIEW_SELECT} WHERE cs.candidate_id = $1 ORDER BY iv.interview_date DESC`,
      [req.params.candidateId]
    );

    res.json(result.rows.map(mapInterview));
  } catch (err) {
    console.error('Get candidate interviews error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- POST /api/interviews ----
router.post('/', async (req, res) => {
  try {
    const {
      submissionId, interviewDate, round, mode,
      feedback, result: interviewResult, offeredCTC, offerStatus,
      joiningDate, recruiterNotes,
    } = req.body;

    if (!submissionId || !interviewDate || !round || !mode) {
      return res.status(400).json({ error: 'submissionId, interviewDate, round, and mode are required.' });
    }

    // Map frontend mode to DB enum
    const dbMode = mode === 'offline' ? 'in_person' :
                   mode === 'online' ? 'virtual' :
                   mode === 'telephonic' ? 'telephone' : mode;

    const insertResult = await pool.query(
      `INSERT INTO interviews (
        submission_id, interview_date, interview_round, interview_mode,
        interview_feedback, result, offered_ctc, offer_status,
        joining_date, recruiter_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        submissionId, interviewDate, round, dbMode,
        feedback || null, interviewResult || 'pending', offeredCTC || null,
        offerStatus || null, joiningDate || null, recruiterNotes || null,
      ]
    );

    // Fetch enriched data
    const enriched = await pool.query(
      `${INTERVIEW_SELECT} WHERE iv.id = $1`,
      [insertResult.rows[0].id]
    );

    const interview = enriched.rows[0];

    // Add timeline entry
    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note, related_company)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        interview.candidate_id, req.user.id,
        `${round} at ${interview.company_name}`,
        'Interview scheduled',
        interview.company_name,
      ]
    );

    res.status(201).json(mapInterview(interview));
  } catch (err) {
    console.error('Create interview error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
