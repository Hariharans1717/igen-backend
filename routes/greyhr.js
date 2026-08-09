// =========================================
// GreyHR Archive Routes — List + Archive
// =========================================
const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const greyhrController = require('../controllers/greyhrController');
const { greyhrListSchema, greyhrArchiveSchema } = require('../validators/greyhr');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(greyhrListSchema), asyncHandler(greyhrController.listArchive));
router.post('/archive', authorize('admin', 'recruiter'), validate(greyhrArchiveSchema), asyncHandler(greyhrController.archiveCandidate));
router.post('/unarchive/:candidateId', authorize('admin', 'recruiter'), asyncHandler(greyhrController.unarchiveCandidate));
router.delete('/:candidateId', authorize('admin', 'recruiter'), asyncHandler(greyhrController.unarchiveCandidate));

module.exports = router;
