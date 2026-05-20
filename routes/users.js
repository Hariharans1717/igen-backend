// =========================================
// Users Routes — Manage HR Users
// =========================================
const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const usersController = require('../controllers/usersController');
const { userCreateSchema, userStatusSchema } = require('../validators/users');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin', 'recruiter'), asyncHandler(usersController.listUsers));
router.post('/', authorize('admin'), validate(userCreateSchema), asyncHandler(usersController.createUserAccount));
router.put('/:id/status', authorize('admin'), validate(userStatusSchema), asyncHandler(usersController.updateUserStatus));

module.exports = router;
