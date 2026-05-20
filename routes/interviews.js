// =========================================
// Interview Routes — CRUD
// =========================================
const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const interviewsController = require('../controllers/interviewsController');
const {
  interviewCreateSchema,
  interviewUpdateSchema,
  interviewListSchema,
  interviewByCandidateSchema,
} = require('../validators/interviews');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(interviewListSchema), asyncHandler(interviewsController.listInterviews));
router.get('/candidate/:candidateId', validate(interviewByCandidateSchema), asyncHandler(interviewsController.getByCandidate));
router.post('/', authorize('admin', 'recruiter'), validate(interviewCreateSchema), asyncHandler(interviewsController.createInterview));
router.put('/:id', authorize('admin', 'recruiter'), validate(interviewUpdateSchema), asyncHandler(interviewsController.updateInterview));
router.delete('/:id', authorize('admin', 'recruiter'), asyncHandler(interviewsController.deleteInterview));

module.exports = router;
