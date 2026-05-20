// =========================================
// Auth Routes — Login, Tokens, Users
// =========================================
const express = require('express');
const devOnly = require('../middleware/devOnly');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');
const authController = require('../controllers/authController');
const {
  loginSchema,
  registerSchema,
  refreshSchema,
  logoutSchema,
  changePasswordSchema,
} = require('../validators/auth');

const router = express.Router();

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/register-admin', devOnly, validate(registerSchema), asyncHandler(authController.registerAdmin));
router.post('/register', authenticate, authorize('admin'), validate(registerSchema), asyncHandler(authController.registerUser));
router.post('/refresh', authLimiter, validate(refreshSchema), asyncHandler(authController.refresh));
router.post('/logout', validate(logoutSchema), asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.me));
router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(authController.changePassword));

module.exports = router;
