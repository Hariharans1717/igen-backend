const pool = require('../config/db');

const mapNoteRow = (row) => ({
  id: row.id,
  candidateId: row.candidate_id,
  content: row.note_text,
  createdBy: row.hr_user_id,
  createdByName: row.created_by_name || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at || row.created_at,
});

const getNotesByCandidate = async (candidateId) => {
  const result = await pool.query(
    `SELECT cn.*, CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
     FROM candidate_notes cn
     LEFT JOIN hr_users u ON u.id = cn.hr_user_id
     WHERE cn.candidate_id = $1
     ORDER BY cn.created_at DESC`,
    [candidateId]
  );

  return result.rows.map(mapNoteRow);
};

const createNote = async ({ candidateId, content }, userId) => {
  const result = await pool.query(
    `INSERT INTO candidate_notes (candidate_id, hr_user_id, note_text)
     VALUES ($1, $2, $3) RETURNING *`,
    [candidateId, userId, content]
  );

  const enriched = await pool.query(
    `SELECT cn.*, CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
     FROM candidate_notes cn
     LEFT JOIN hr_users u ON u.id = cn.hr_user_id
     WHERE cn.id = $1`,
    [result.rows[0].id]
  );

  return mapNoteRow(enriched.rows[0]);
};

const updateNote = async (id, content) => {
  const noteResult = await pool.query('SELECT * FROM candidate_notes WHERE id = $1', [id]);
  if (noteResult.rows.length === 0) return { error: 'not_found' };

  const note = noteResult.rows[0];
  const hourAgo = new Date(Date.now() - 3600000);
  if (new Date(note.created_at) < hourAgo) return { error: 'expired' };

  await pool.query(
    'UPDATE candidate_notes SET note_text = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [content, id]
  );

  const enriched = await pool.query(
    `SELECT cn.*, CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
     FROM candidate_notes cn
     LEFT JOIN hr_users u ON u.id = cn.hr_user_id
     WHERE cn.id = $1`,
    [id]
  );

  return { note: mapNoteRow(enriched.rows[0]) };
};

const deleteNote = async (id) => {
  const result = await pool.query('DELETE FROM candidate_notes WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
};

module.exports = {
  getNotesByCandidate,
  createNote,
  updateNote,
  deleteNote,
};
