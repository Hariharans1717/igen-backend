// =========================================
// Dashboard Routes — KPIs & Analytics
// =========================================
const express = require('express');
const authenticate = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.use(authenticate);

router.get('/kpis', asyncHandler(dashboardController.getKPIs));
router.get('/recruiter-performance', asyncHandler(dashboardController.getRecruiterPerformance));
router.get('/company-hiring', asyncHandler(dashboardController.getCompanyHiring));
router.get('/monthly-trends', asyncHandler(dashboardController.getMonthlyTrends));

module.exports = router;
