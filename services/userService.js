const pool = require('../config/db');
const { mapUserRow } = require('./authService');

const listUsers = async () => {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, role, is_active, created_at
     FROM hr_users
     WHERE is_active = true
     ORDER BY first_name`
  );

  return result.rows.map(mapUserRow);
};

const updateUserStatus = async (id, isActive) => {
  const result = await pool.query(
    'UPDATE hr_users SET is_active = $1 WHERE id = $2 RETURNING *',
    [isActive, id]
  );

  return result.rows[0] || null;
};

module.exports = {
  listUsers,
  updateUserStatus,
};
