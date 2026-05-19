const pool = require('../config/db');
const { mapNotificationTypeFromDb } = require('../utils/mappers');

const mapNotificationRow = (row) => ({
  id: row.id,
  userId: row.hr_user_id,
  type: mapNotificationTypeFromDb(row.type),
  message: row.message,
  isRead: row.is_read,
  candidateId: row.related_candidate_id || undefined,
  candidateName: row.candidate_name || undefined,
  dueDate: row.due_date || undefined,
  createdAt: row.created_at,
});

const listNotifications = async (userId) => {
  const result = await pool.query(
    `SELECT n.*, c.name AS candidate_name
     FROM notifications n
     LEFT JOIN candidates c ON c.id = n.related_candidate_id
     WHERE n.hr_user_id = $1
     ORDER BY n.created_at DESC`,
    [userId]
  );

  return result.rows.map(mapNotificationRow);
};

const markNotificationRead = async (id, userId) => {
  const result = await pool.query(
    'UPDATE notifications SET is_read = true WHERE id = $1 AND hr_user_id = $2 RETURNING id',
    [id, userId]
  );
  return result.rows.length > 0;
};

const markAllNotificationsRead = async (userId) => {
  await pool.query('UPDATE notifications SET is_read = true WHERE hr_user_id = $1', [userId]);
};

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
