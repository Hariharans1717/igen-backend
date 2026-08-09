const candidateService = require('../services/candidateService');

const listCandidates = async (req, res) => {
  const query = req.validated.query;
  const data = await candidateService.listCandidates(query);
  return res.json(data);
};

const getCandidate = async (req, res) => {
  const candidate = await candidateService.getCandidateById(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });
  return res.json(candidate);
};

const createCandidate = async (req, res) => {
  try {
    console.log('📨 [createCandidate] Received request');
    console.log('👤 User ID:', req.user.id);
    console.log('📦 Validated Body:', JSON.stringify(req.validated.body, null, 2));
    
    const candidate = await candidateService.createCandidate(req.validated.body, req.user.id);
    
    console.log('✅ [createCandidate] Candidate created successfully');
    console.log('📤 Response:', JSON.stringify(candidate, null, 2));
    
    return res.status(201).json(candidate);
  } catch (error) {
    console.error('❌ [createCandidate] Error:', error.message);
    console.error('🔍 Stack:', error.stack);
    throw error;
  }
};

const updateCandidate = async (req, res) => {
  const candidate = await candidateService.updateCandidate(req.params.id, req.validated.body, req.user.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });
  return res.json(candidate);
};

const deleteCandidate = async (req, res) => {
  const success = await candidateService.softDeleteCandidate(req.params.id, req.user.id);
  if (!success) return res.status(404).json({ error: 'Candidate not found.' });
  return res.json({ success: true });
};

const checkDuplicate = async (req, res) => {
  const { email, mobile, excludeId } = req.validated.body;
  if (!email && !mobile) {
    return res.status(400).json({ error: 'Email or mobile is required.' });
  }
  const result = await candidateService.checkDuplicate({ email, mobile, excludeId });
  return res.json(result);
};

const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }
  const candidate = await candidateService.updateCandidate(id, { status }, req.user?.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });
  return res.json({ success: true, candidate });
};

const getCandidateHistory = async (req, res) => {
  const history = await candidateService.getCandidateHistory(req.params.id);
  return res.json(history);
};

module.exports = {
  listCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  checkDuplicate,
  getCandidateHistory,
  updateStatus,
};
