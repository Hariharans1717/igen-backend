// =========================================
// Notes Routes — CRUD (Edit within 1 hour)
// =========================================
const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const notesController = require('../controllers/notesController');
const {
  noteCreateSchema,
  noteUpdateSchema,
  noteDeleteSchema,
  noteByCandidateSchema,
} = require('../validators/notes');

const router = express.Router();

router.use(authenticate);

router.get('/candidate/:candidateId', validate(noteByCandidateSchema), asyncHandler(notesController.getByCandidate));
router.post('/', authorize('admin', 'recruiter'), validate(noteCreateSchema), asyncHandler(notesController.createNote));
router.put('/:id', authorize('admin', 'recruiter'), validate(noteUpdateSchema), asyncHandler(notesController.updateNote));
router.delete('/:id', authorize('admin', 'recruiter'), validate(noteDeleteSchema), asyncHandler(notesController.deleteNote));

module.exports = router;
