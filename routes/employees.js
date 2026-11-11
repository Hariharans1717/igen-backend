const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const employeesController = require('../controllers/employeesController');
const {
  employeeListSchema,
  employeeCreateSchema,
  employeeUpdateSchema,
  employeeDeleteSchema,
} = require('../validators/employees');

const router = express.Router();

router.use(authenticate);
router.get('/', validate(employeeListSchema), asyncHandler(employeesController.listEmployees));
router.post('/', authorize('admin', 'recruiter'), validate(employeeCreateSchema), asyncHandler(employeesController.createEmployee));
router.put('/:id', authorize('admin', 'recruiter'), validate(employeeUpdateSchema), asyncHandler(employeesController.updateEmployee));
router.delete('/:id', authorize('admin', 'recruiter'), validate(employeeDeleteSchema), asyncHandler(employeesController.deleteEmployee));

module.exports = router;