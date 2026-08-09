const greyhrService = require('../services/greyhrService');

const listArchive = async (req, res) => {
  const data = await greyhrService.listArchive(req.validated.query);
  return res.json(data);
};

const archiveCandidate = async (req, res) => {
  const entry = await greyhrService.archiveCandidate(req.validated.body, req.user.id);
  if (!entry) return res.status(404).json({ error: 'Candidate not found.' });
  return res.status(201).json(entry);
};

const unarchiveCandidate = async (req, res) => {
  const candidateId = req.params.candidateId || req.body.candidateId;
  const candidate = await greyhrService.unarchiveCandidate(candidateId, req.user?.id);
  if (!candidate) return res.status(404).json({ error: 'Archived candidate not found.' });
  return res.json({ success: true, candidate });
};

module.exports = {
  listArchive,
  archiveCandidate,
  unarchiveCandidate,
};
