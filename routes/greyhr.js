// =========================================
// GreyHR Archive Routes — List + Archive
// =========================================
const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ---- Helper: Map DB row to frontend GreyHRArchiveEntry shape ----
function mapArchiveEntry(row) {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    candidateName: row.candidate_name || '',
    companyName: row.joined_company,
    joiningDate: row.joining_date || row.archive_date,
    archivedDate: row.archive_date,
    archivedBy: row.archived_by,
    archivedByName: row.archived_by_name || '',
  };
}

// ---- GET /api/greyhr ----
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
      whereClause = `WHERE (c.name ILIKE $${paramIndex} OR ga.joined_company ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM greyhr_archive ga
       LEFT JOIN candidates c ON c.id = ga.candidate_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `SELECT ga.*,
        c.name AS candidate_name,
        CONCAT(u.first_name, ' ', u.last_name) AS archived_by_name,
        (ga.profile_data->>'joining_date') AS joining_date
       FROM greyhr_archive ga
       LEFT JOIN candidates c ON c.id = ga.candidate_id
       LEFT JOIN hr_users u ON u.id = ga.archived_by
       ${whereClause}
       ORDER BY ga.archive_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, size, offset]
    );

    res.json({
      data: dataResult.rows.map(mapArchiveEntry),
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    });
  } catch (err) {
    console.error('Get greyhr archive error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- POST /api/greyhr/archive ----
router.post('/archive', async (req, res) => {
  try {
    const { candidateId, companyName, joiningDate } = req.body;

    if (!candidateId || !companyName) {
      return res.status(400).json({ error: 'candidateId and companyName are required.' });
    }

    // Get candidate data for snapshot
    const candidateResult = await pool.query(
      'SELECT * FROM candidates WHERE id = $1',
      [candidateId]
    );

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    const candidate = candidateResult.rows[0];

    // Get submissions and timeline for snapshot
    const submissions = await pool.query(
      'SELECT * FROM candidate_submissions WHERE candidate_id = $1',
      [candidateId]
    );
    const timeline = await pool.query(
      'SELECT * FROM candidate_timeline WHERE candidate_id = $1',
      [candidateId]
    );

    const profileData = {
      candidate: candidate,
      submissions: submissions.rows,
      timeline: timeline.rows,
      joining_date: joiningDate,
    };

    // Insert archive entry
    const result = await pool.query(
      `INSERT INTO greyhr_archive (candidate_id, archived_by, joined_company, profile_data)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [candidateId, req.user.id, companyName, JSON.stringify(profileData)]
    );

    // Update candidate status
    await pool.query(
      "UPDATE candidates SET status = 'joined' WHERE id = $1",
      [candidateId]
    );

    // Add timeline entry
    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note, related_company)
       VALUES ($1, $2, $3, $4, $5)`,
      [candidateId, req.user.id, 'Archived to GreyHR', `Profile archived after joining ${companyName}`, companyName]
    );

    // Fetch enriched entry
    const enriched = await pool.query(
      `SELECT ga.*,
        c.name AS candidate_name,
        CONCAT(u.first_name, ' ', u.last_name) AS archived_by_name,
        (ga.profile_data->>'joining_date') AS joining_date
       FROM greyhr_archive ga
       LEFT JOIN candidates c ON c.id = ga.candidate_id
       LEFT JOIN hr_users u ON u.id = ga.archived_by
       WHERE ga.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(mapArchiveEntry(enriched.rows[0]));
  } catch (err) {
    console.error('Archive candidate error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
