const submissionService = require('../services/submissionService');

const listSubmissions = async (req, res) => {
  const data = await submissionService.listSubmissions(req.validated.query);
  return res.json(data);
};

const getByCandidate = async (req, res) => {
  const data = await submissionService.getSubmissionsByCandidate(req.params.candidateId);
  return res.json(data);
};

const createSubmission = async (req, res) => {
  const submission = await submissionService.createSubmission(req.validated.body, req.user.id);
  return res.status(201).json(submission);
};

const updateSubmission = async (req, res) => {
  const submission = await submissionService.updateSubmission(req.params.id, req.validated.body);
  if (!submission) return res.status(404).json({ error: 'Submission not found.' });
  return res.json(submission);
};

const deleteSubmission = async (req, res) => {
  const success = await submissionService.deleteSubmission(req.params.id);
  if (!success) return res.status(404).json({ error: 'Submission not found.' });
  return res.json({ success: true });
};

const checkDuplicate = async (req, res) => {
  const { candidateId, companyName } = req.validated.body;
  const exists = await submissionService.checkDuplicateSubmission(candidateId, companyName);
  return res.json({ exists });
};

module.exports = {
  listSubmissions,
  getByCandidate,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  checkDuplicate,
};
