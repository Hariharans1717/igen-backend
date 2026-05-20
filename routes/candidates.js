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

router.get('/', validate(candidateListSchema), asyncHandler(candidatesController.listCandidates));
router.get('/:id', asyncHandler(candidatesController.getCandidate));
router.post('/', authorize('admin', 'recruiter'), validate(candidateCreateSchema), asyncHandler(candidatesController.createCandidate));
router.put('/:id', authorize('admin', 'recruiter'), validate(candidateUpdateSchema), asyncHandler(candidatesController.updateCandidate));
router.delete('/:id', authorize('admin', 'recruiter'), asyncHandler(candidatesController.deleteCandidate));
router.post('/check-duplicate', validate(candidateDuplicateSchema), asyncHandler(candidatesController.checkDuplicate));

module.exports = router;
