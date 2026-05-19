const timelineService = require('../services/timelineService');

const getByCandidate = async (req, res) => {
  const data = await timelineService.getTimelineByCandidate(req.params.candidateId);
  return res.json(data);
};

module.exports = {
  getByCandidate,
};
