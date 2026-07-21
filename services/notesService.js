const pool = require('../config/db');

const mapNoteRow = (row) => ({
  id: row.id,
  candidateId: row.candidate_id,
  title: row.title || 'Note',
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

const createNote = async ({ candidateId, content, title }, userId) => {
  const noteTitle = title || 'Note';
  const result = await pool.query(
    `INSERT INTO candidate_notes (candidate_id, hr_user_id, title, note_text)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [candidateId, userId, noteTitle, content]
  );

  const enriched = await pool.query(
    `SELECT cn.*, CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
     FROM candidate_notes cn
     LEFT JOIN hr_users u ON u.id = cn.hr_user_id
     WHERE cn.id = $1`,
    [result.rows[0].id]
  );

  const noteData = mapNoteRow(enriched.rows[0]);

  // Insert entry into candidate_history (Audit Trail)
  await pool.query(
    `INSERT INTO candidate_history (candidate_id, changed_by, change_type, old_data, new_data, created_at)
     VALUES ($1, $2, $3, NULL, $4, CURRENT_TIMESTAMP)`,
    [
      candidateId,
      userId,
      'note_added',
      JSON.stringify({
        id: noteData.id,
        title: noteTitle,
        content: content,
        date: noteData.createdAt,
        createdByName: noteData.createdByName,
      }),
    ]
  );

  // Insert entry into candidate_timeline
  await pool.query(
    `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
     VALUES ($1, $2, $3, $4)`,
    [candidateId, userId, `Main Note Added: ${noteTitle}`, content]
  );

  return noteData;
};

const updateNote = async (id, content, title, userId) => {
  const noteResult = await pool.query('SELECT * FROM candidate_notes WHERE id = $1', [id]);
  if (noteResult.rows.length === 0) return { error: 'not_found' };

  const note = noteResult.rows[0];
  const hourAgo = new Date(Date.now() - 3600000);
  if (new Date(note.created_at) < hourAgo) return { error: 'expired' };

  const noteTitle = title || note.title || 'Note';
  await pool.query(
    'UPDATE candidate_notes SET title = $1, note_text = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
    [noteTitle, content, id]
  );

  const enriched = await pool.query(
    `SELECT cn.*, CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
     FROM candidate_notes cn
     LEFT JOIN hr_users u ON u.id = cn.hr_user_id
     WHERE cn.id = $1`,
    [id]
  );

  const updatedNote = mapNoteRow(enriched.rows[0]);

  // Insert entry into candidate_history
  await pool.query(
    `INSERT INTO candidate_history (candidate_id, changed_by, change_type, old_data, new_data, created_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
    [
      note.candidate_id,
      userId,
      'note_updated',
      JSON.stringify({ title: note.title, content: note.note_text }),
      JSON.stringify({ title: updatedNote.title, content: updatedNote.content, date: updatedNote.updatedAt }),
    ]
  );

  return { note: updatedNote };
};

const deleteNote = async (id, userId) => {
  const noteResult = await pool.query('SELECT * FROM candidate_notes WHERE id = $1', [id]);
  if (noteResult.rows.length === 0) return false;
  const note = noteResult.rows[0];

  await pool.query('DELETE FROM candidate_notes WHERE id = $1', [id]);

  // Insert entry into candidate_history
  await pool.query(
    `INSERT INTO candidate_history (candidate_id, changed_by, change_type, old_data, new_data, created_at)
     VALUES ($1, $2, $3, $4, NULL, CURRENT_TIMESTAMP)`,
    [
      note.candidate_id,
      userId,
      'note_deleted',
      JSON.stringify({ title: note.title, content: note.note_text, createdAt: note.created_at }),
    ]
  );

  return true;
};

module.exports = {
  getNotesByCandidate,
  createNote,
  updateNote,
  deleteNote,
};
