// =========================================
// Submission Routes — CRUD + Duplicate Check
// =========================================
const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const submissionsController = require('../controllers/submissionsController');
const {
  submissionCreateSchema,
  submissionUpdateSchema,
  submissionListSchema,
  submissionDuplicateSchema,
  submissionByCandidateSchema,
} = require('../validators/submissions');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(submissionListSchema), asyncHandler(submissionsController.listSubmissions));
router.get('/candidate/:candidateId', validate(submissionByCandidateSchema), asyncHandler(submissionsController.getByCandidate));
router.post('/', authorize('admin', 'recruiter'), validate(submissionCreateSchema), asyncHandler(submissionsController.createSubmission));
router.put('/:id', authorize('admin', 'recruiter'), validate(submissionUpdateSchema), asyncHandler(submissionsController.updateSubmission));
router.delete('/:id', authorize('admin', 'recruiter'), asyncHandler(submissionsController.deleteSubmission));
router.post('/check-duplicate', validate(submissionDuplicateSchema), asyncHandler(submissionsController.checkDuplicate));

module.exports = router;
