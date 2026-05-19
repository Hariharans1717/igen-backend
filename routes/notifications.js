// =========================================
// Notification Routes — Read + Mark Read
// =========================================
const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ---- Helper: Map DB row to frontend Notification shape ----
function mapNotification(row) {
  return {
    id: row.id,
    userId: row.hr_user_id,
    type: row.type,
    message: row.message,
    isRead: row.is_read,
    candidateId: row.related_candidate_id || undefined,
    candidateName: row.candidate_name || undefined,
    dueDate: row.due_date || undefined,
    createdAt: row.created_at,
  };
}

// ---- GET /api/notifications ----
// Returns notifications for the logged-in user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*,
        c.name AS candidate_name
       FROM notifications n
       LEFT JOIN candidates c ON c.id = n.related_candidate_id
       WHERE n.hr_user_id = $1
       ORDER BY n.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows.map(mapNotification));
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- PUT /api/notifications/:id/read ----
router.put('/:id/read', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND hr_user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- PUT /api/notifications/read-all ----
router.put('/read-all', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE hr_user_id = $1',
      [req.user.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
