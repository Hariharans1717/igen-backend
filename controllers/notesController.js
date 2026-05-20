const notesService = require('../services/notesService');

const getByCandidate = async (req, res) => {
  const data = await notesService.getNotesByCandidate(req.params.candidateId);
  return res.json(data);
};

const createNote = async (req, res) => {
  const note = await notesService.createNote(req.validated.body, req.user.id);
  return res.status(201).json(note);
};

const updateNote = async (req, res) => {
  const result = await notesService.updateNote(req.params.id, req.validated.body.content);
  if (result?.error === 'not_found') return res.status(404).json({ error: 'Note not found.' });
  if (result?.error === 'expired') return res.status(403).json({ error: 'Notes can only be edited within 1 hour of creation.' });
  return res.json(result.note);
};

const deleteNote = async (req, res) => {
  const success = await notesService.deleteNote(req.params.id);
  if (!success) return res.status(404).json({ error: 'Note not found.' });
  return res.json({ success: true });
};

module.exports = {
  getByCandidate,
  createNote,
  updateNote,
  deleteNote,
};
