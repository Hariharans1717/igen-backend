const pool = require('../config/db');

const mapTimelineRow = (row) => ({
  id: row.id,
  candidateId: row.candidate_id,
  action: row.action,
  note: row.note || '',
  hrName: row.hr_name || 'System',
  relatedCompany: row.related_company || undefined,
  timestamp: row.created_at,
});

const getTimelineByCandidate = async (candidateId) => {
  const result = await pool.query(
    `SELECT ct.*, CONCAT(u.first_name, ' ', u.last_name) AS hr_name
     FROM candidate_timeline ct
     LEFT JOIN hr_users u ON u.id = ct.hr_user_id
     WHERE ct.candidate_id = $1
     ORDER BY ct.created_at DESC`,
    [candidateId]
  );

  return result.rows.map(mapTimelineRow);
};

module.exports = {
  getTimelineByCandidate,
};
