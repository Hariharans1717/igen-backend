const notesService = require('../services/notesService');

const getByCandidate = async (req, res) => {
  const data = await notesService.getNotesByCandidate(req.params.candidateId);
  return res.json(data);
};

const getNoteHistory = async (req, res) => {
  const history = await notesService.getNoteHistory(req.params.id);
  return res.json(history);
};

const createNote = async (req, res) => {
  const note = await notesService.createNote(req.validated.body, req.user?.id);
  return res.status(201).json(note);
};

const updateNote = async (req, res) => {
  const { content, title, category, priority, status, changeReason } = req.validated.body;
  const result = await notesService.updateNote(req.params.id, content, title, req.user?.id, category, priority, status, changeReason);
  if (result?.error === 'not_found') return res.status(404).json({ error: 'Note not found.' });
  return res.json(result.note);
};

const deleteNote = async (req, res) => {
  const success = await notesService.deleteNote(req.params.id, req.user?.id);
  if (!success) return res.status(404).json({ error: 'Note not found.' });
  return res.json({ success: true });
};

module.exports = {
  getByCandidate,
  getNoteHistory,
  createNote,
  updateNote,
  deleteNote,
};
