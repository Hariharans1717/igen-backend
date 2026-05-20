const { createUser, mapUserRow } = require('../services/authService');
const userService = require('../services/userService');

const listUsers = async (req, res) => {
  const data = await userService.listUsers();
  return res.json(data);
};

const createUserAccount = async (req, res) => {
  const { firstName, lastName, email, mobile, password, role } = req.validated.body;
  const user = await createUser({ firstName, lastName, email, mobile, password, role });
  return res.status(201).json({ user: mapUserRow(user) });
};

const updateUserStatus = async (req, res) => {
  const user = await userService.updateUserStatus(req.params.id, req.validated.body.isActive);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user: mapUserRow(user) });
};

module.exports = {
  listUsers,
  createUserAccount,
  updateUserStatus,
};
