// =========================================
// Timeline Routes — Read by Candidate
// =========================================
const express = require('express');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const timelineController = require('../controllers/timelineController');
const { candidateIdParamSchema } = require('../validators/common');

const router = express.Router();

router.use(authenticate);

router.get(
	'/candidate/:candidateId',
	validate(z.object({ params: candidateIdParamSchema })),
	asyncHandler(timelineController.getByCandidate)
);

module.exports = router;
