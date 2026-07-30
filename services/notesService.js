const pool = require('../config/db');

const mapNoteRow = (row) => ({
  id: row.id,
  noteId: row.id,
  candidateId: row.candidate_id,
  title: row.title || 'Note',
  content: row.note_text,
  category: row.category || 'personal_note',
  priority: row.priority || 'medium',
  status: row.status || 'open',
  tags: row.tags || [],
  createdBy: row.hr_user_id || 'system',
  createdByName: row.created_by_name || 'You',
  createdAt: row.created_at,
  updatedAt: row.updated_at || row.created_at,
  editHistory: (row.edit_history || []).map(e => ({
    version: e.version,
    previousContent: e.previous_content,
    editedAt: e.edited_at,
    editedBy: e.edited_by || 'You',
    changeReason: e.change_reason || undefined
  }))
});

const getNotesByCandidate = async (candidateId) => {
  const result = await pool.query(
    `SELECT cn.*, 
       CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
       COALESCE(
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'version', h.version,
             'previous_content', h.previous_content,
             'edited_by', h.edited_by,
             'edited_at', h.edited_at,
             'change_reason', h.change_reason
           ) ORDER BY h.version ASC
         ) FILTER (WHERE h.edit_id IS NOT NULL),
         '[]'::json
       ) AS edit_history
     FROM candidate_notes cn
     LEFT JOIN hr_users u ON u.id = cn.hr_user_id
     LEFT JOIN note_edit_history h ON h.note_id = cn.id
     WHERE cn.candidate_id = $1
     GROUP BY cn.id, u.first_name, u.last_name
     ORDER BY cn.created_at DESC`,
    [candidateId]
  );

  return result.rows.map(mapNoteRow);
};

const createNote = async ({ candidateId, content, title, category, priority, status, tags }, userId) => {
  const noteTitle = title || 'Note';
  const noteCategory = category || 'personal_note';
  const notePriority = priority || 'medium';
  const noteStatus = status || 'open';
  const noteTags = Array.isArray(tags) ? tags : [];

  const result = await pool.query(
    `INSERT INTO candidate_notes (candidate_id, hr_user_id, title, note_text, category, priority, status, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [candidateId, userId, noteTitle, content, noteCategory, notePriority, noteStatus, noteTags]
  );

  const enriched = await pool.query(
    `SELECT cn.*, CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
     FROM candidate_notes cn
     LEFT JOIN hr_users u ON u.id = cn.hr_user_id
     WHERE cn.id = $1`,
    [result.rows[0].id]
  );

  const noteData = mapNoteRow(enriched.rows[0]);

  // Insert entry into candidate_timeline
  await pool.query(
    `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
     VALUES ($1, $2, $3, $4)`,
    [candidateId, userId, `Note Added (${noteCategory.replace(/_/g, ' ')})`, content]
  );

  return noteData;
};

const updateNote = async (id, content, title, userId, category, priority, status, changeReason) => {
  const noteResult = await pool.query('SELECT * FROM candidate_notes WHERE id = $1', [id]);
  if (noteResult.rows.length === 0) return { error: 'not_found' };

  const note = noteResult.rows[0];

  // If content changed, record previous version in note_edit_history
  if (content && content.trim() !== note.note_text.trim()) {
    const historyRes = await pool.query('SELECT COUNT(*)::int AS count FROM note_edit_history WHERE note_id = $1', [id]);
    const version = (historyRes.rows[0]?.count || 0) + 1;

    // Get user name if available
    let editorName = 'You';
    if (userId) {
      const uRes = await pool.query("SELECT CONCAT(first_name, ' ', last_name) AS name FROM hr_users WHERE id = $1", [userId]);
      if (uRes.rows[0]?.name) editorName = uRes.rows[0].name;
    }

    await pool.query(
      `INSERT INTO note_edit_history (note_id, version, previous_content, edited_by, change_reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, version, note.note_text, editorName, changeReason || null]
    );
  }

  const noteTitle = title || note.title || 'Note';
  const noteCategory = category || note.category || 'personal_note';
  const notePriority = priority || note.priority || 'medium';
  const noteStatus = status || note.status || 'open';
  const noteContent = content !== undefined ? content : note.note_text;

  await pool.query(
    `UPDATE candidate_notes 
     SET title = $1, note_text = $2, category = $3, priority = $4, status = $5, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $6`,
    [noteTitle, noteContent, noteCategory, notePriority, noteStatus, id]
  );

  const updatedNotes = await getNotesByCandidate(note.candidate_id);
  const updatedNote = updatedNotes.find(n => n.id === id);

  return { note: updatedNote };
};

const deleteNote = async (id, userId) => {
  const noteResult = await pool.query('SELECT * FROM candidate_notes WHERE id = $1', [id]);
  if (noteResult.rows.length === 0) return false;
  const note = noteResult.rows[0];

  await pool.query('DELETE FROM candidate_notes WHERE id = $1', [id]);
  return true;
};

const getNoteHistory = async (noteId) => {
  const result = await pool.query(
    `SELECT edit_id AS "editId", version, previous_content AS "previousContent", edited_by AS "editedBy", edited_at AS "editedAt", change_reason AS "changeReason"
     FROM note_edit_history
     WHERE note_id = $1
     ORDER BY version ASC`,
    [noteId]
  );
  return result.rows;
};

module.exports = {
  getNotesByCandidate,
  createNote,
  updateNote,
  deleteNote,
  getNoteHistory,
};
