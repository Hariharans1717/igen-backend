// =========================================
// Users Routes — List All HR Users
// =========================================
const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ---- GET /api/users ----
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, is_active, created_at
       FROM hr_users
       WHERE is_active = true
       ORDER BY first_name`
    );

    const users = result.rows.map(row => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      avatar: '',
    }));

    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
