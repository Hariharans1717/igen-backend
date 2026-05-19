// =========================================
// Notes Routes — CRUD (Edit within 1 hour)
// =========================================
const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ---- Helper: Map DB row to frontend CandidateNote shape ----
function mapNote(row) {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    content: row.note_text,
    createdBy: row.hr_user_id,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

// ---- GET /api/notes/candidate/:candidateId ----
router.get('/candidate/:candidateId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cn.*,
        CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
        cn.created_at AS updated_at
       FROM candidate_notes cn
       LEFT JOIN hr_users u ON u.id = cn.hr_user_id
       WHERE cn.candidate_id = $1
       ORDER BY cn.created_at DESC`,
      [req.params.candidateId]
    );

    res.json(result.rows.map(mapNote));
  } catch (err) {
    console.error('Get notes error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- POST /api/notes ----
router.post('/', async (req, res) => {
  try {
    const { candidateId, content } = req.body;

    if (!candidateId || !content) {
      return res.status(400).json({ error: 'candidateId and content are required.' });
    }

    const result = await pool.query(
      `INSERT INTO candidate_notes (candidate_id, hr_user_id, note_text)
       VALUES ($1, $2, $3) RETURNING *`,
      [candidateId, req.user.id, content]
    );

    // Fetch with user name
    const enriched = await pool.query(
      `SELECT cn.*,
        CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
        cn.created_at AS updated_at
       FROM candidate_notes cn
       LEFT JOIN hr_users u ON u.id = cn.hr_user_id
       WHERE cn.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(mapNote(enriched.rows[0]));
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- PUT /api/notes/:id ----
// Only allows editing within 1 hour of creation
router.put('/:id', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required.' });
    }

    // Check note exists and is within edit window
    const noteResult = await pool.query(
      'SELECT * FROM candidate_notes WHERE id = $1',
      [req.params.id]
    );

    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    const note = noteResult.rows[0];
    const hourAgo = new Date(Date.now() - 3600000);

    if (new Date(note.created_at) < hourAgo) {
      return res.status(403).json({ error: 'Notes can only be edited within 1 hour of creation.' });
    }

    // Update note
    await pool.query(
      'UPDATE candidate_notes SET note_text = $1 WHERE id = $2',
      [content, req.params.id]
    );

    // Fetch updated note
    const enriched = await pool.query(
      `SELECT cn.*,
        CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
        cn.created_at AS updated_at
       FROM candidate_notes cn
       LEFT JOIN hr_users u ON u.id = cn.hr_user_id
       WHERE cn.id = $1`,
      [req.params.id]
    );

    res.json(mapNote(enriched.rows[0]));
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
