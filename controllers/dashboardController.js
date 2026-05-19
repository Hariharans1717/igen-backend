const dashboardService = require('../services/dashboardService');

const getKPIs = async (req, res) => {
  const data = await dashboardService.getKPIs();
  return res.json(data);
};

const getRecruiterPerformance = async (req, res) => {
  const data = await dashboardService.getRecruiterPerformance();
  return res.json(data);
};

const getCompanyHiring = async (req, res) => {
  const data = await dashboardService.getCompanyHiring();
  return res.json(data);
};

const getMonthlyTrends = async (req, res) => {
  const data = await dashboardService.getMonthlyTrends();
  return res.json(data);
};

module.exports = {
  getKPIs,
  getRecruiterPerformance,
  getCompanyHiring,
  getMonthlyTrends,
};
