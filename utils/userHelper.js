const pool = require('../config/db');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolves a valid UUID for hr_users.id.
 * If the provided userId is not a valid UUID or does not exist in hr_users (e.g. legacy demo token '1'),
 * it falls back to the default admin user or first active user, or null.
 */
async function resolveValidHrUserId(userId) {
  if (userId && UUID_REGEX.test(String(userId))) {
    try {
      const check = await pool.query('SELECT id FROM hr_users WHERE id = $1', [userId]);
      if (check.rows.length > 0) {
        return check.rows[0].id;
      }
    } catch (err) {
      console.warn('⚠️ Error checking hr_user id:', err.message);
    }
  }

  try {
    const admin = await pool.query("SELECT id FROM hr_users WHERE email = 'priya@igen.in' OR role = 'admin' ORDER BY created_at ASC LIMIT 1");
    if (admin.rows.length > 0) {
      return admin.rows[0].id;
    }
    const anyUser = await pool.query("SELECT id FROM hr_users ORDER BY created_at ASC LIMIT 1");
    if (anyUser.rows.length > 0) {
      return anyUser.rows[0].id;
    }
  } catch (err) {
    console.warn('⚠️ Error finding fallback hr_user:', err.message);
  }

  return null;
}

module.exports = {
  resolveValidHrUserId,
};
