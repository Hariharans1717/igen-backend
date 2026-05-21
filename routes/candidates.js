// =========================================
// Candidate Routes — CRUD + Filters + Duplicate Check
// =========================================
const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const candidatesController = require('../controllers/candidatesController');
const {
  candidateCreateSchema,
  candidateUpdateSchema,
  candidateListSchema,
  candidateDuplicateSchema,
} = require('../validators/candidates');

const router = express.Router();

router.use(authenticate);

// Check duplicate route must come BEFORE /:id route to avoid route matching issues
router.post('/check-duplicate', validate(candidateDuplicateSchema), asyncHandler(candidatesController.checkDuplicate));

// CRUD routes
router.get('/', validate(candidateListSchema), asyncHandler(candidatesController.listCandidates));
router.post('/', authorize('admin', 'recruiter'), validate(candidateCreateSchema), asyncHandler(candidatesController.createCandidate));
router.get('/:id', asyncHandler(candidatesController.getCandidate));
router.put('/:id', authorize('admin', 'recruiter'), validate(candidateUpdateSchema), asyncHandler(candidatesController.updateCandidate));
router.delete('/:id', authorize('admin', 'recruiter'), asyncHandler(candidatesController.deleteCandidate));

module.exports = router;
