const interviewService = require('../services/interviewService');

const listInterviews = async (req, res) => {
  const data = await interviewService.listInterviews(req.validated.query);
  return res.json(data);
};

const getByCandidate = async (req, res) => {
  const data = await interviewService.getInterviewsByCandidate(req.params.candidateId);
  return res.json(data);
};

const createInterview = async (req, res) => {
  const interview = await interviewService.createInterview(req.validated.body, req.user.id);
  return res.status(201).json(interview);
};

const updateInterview = async (req, res) => {
  const interview = await interviewService.updateInterview(req.params.id, req.validated.body);
  if (!interview) return res.status(404).json({ error: 'Interview not found.' });
  return res.json(interview);
};

const deleteInterview = async (req, res) => {
  const success = await interviewService.deleteInterview(req.params.id);
  if (!success) return res.status(404).json({ error: 'Interview not found.' });
  return res.json({ success: true });
};

module.exports = {
  listInterviews,
  getByCandidate,
  createInterview,
  updateInterview,
  deleteInterview,
};
