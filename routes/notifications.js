// =========================================
// Notification Routes — Read + Mark Read
// =========================================
const express = require('express');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const notificationsController = require('../controllers/notificationsController');
const { notificationReadSchema } = require('../validators/notifications');

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(notificationsController.listNotifications));
router.put('/:id/read', validate(notificationReadSchema), asyncHandler(notificationsController.markRead));
router.put('/read-all', asyncHandler(notificationsController.markAllRead));

module.exports = router;
