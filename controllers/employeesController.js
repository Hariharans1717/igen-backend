const employeesService = require('../services/employeesService');

const listEmployees = async (req, res) => {
  const data = await employeesService.listEmployees(req.validated.query);
  return res.json(data);
};

const createEmployee = async (req, res) => {
  try {
    const employee = await employeesService.createEmployee(req.validated.body, req.user.id);
    return res.status(201).json(employee);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'This candidate is already registered as an employee.' });
    throw error;
  }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await employeesService.updateEmployee(req.params.id, req.validated.body);
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });
    return res.json(employee);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'This candidate is already registered as an employee.' });
    throw error;
  }
};

const deleteEmployee = async (req, res) => {
  const deleted = await employeesService.deleteEmployee(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Employee not found.' });
  return res.json({ success: true });
};

module.exports = { listEmployees, createEmployee, updateEmployee, deleteEmployee };