const notificationsService = require('../services/notificationsService');

const listNotifications = async (req, res) => {
  const data = await notificationsService.listNotifications(req.user.id);
  return res.json(data);
};

const markRead = async (req, res) => {
  const success = await notificationsService.markNotificationRead(req.params.id, req.user.id);
  if (!success) return res.status(404).json({ error: 'Notification not found.' });
  return res.json({ success: true });
};

const markAllRead = async (req, res) => {
  await notificationsService.markAllNotificationsRead(req.user.id);
  return res.json({ success: true });
};

module.exports = {
  listNotifications,
  markRead,
  markAllRead,
};
