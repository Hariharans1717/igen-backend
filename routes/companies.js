const express = require('express');
const router = express.Router();
const companiesController = require('../controllers/companiesController');

// Optional auth helper middleware
const optionalAuth = (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = bearerToken || req.headers['x-access-token'];
  if (token && process.env.JWT_SECRET) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      // ignore invalid token for optional auth
    }
  }
  next();
};

router.get('/', companiesController.listCompanies);
router.get('/:id', companiesController.getCompanyById);

router.post('/', optionalAuth, companiesController.createCompany);
router.put('/:id', optionalAuth, companiesController.updateCompany);
router.delete('/:id', optionalAuth, companiesController.deleteCompany);

router.post('/:companyId/branches', optionalAuth, companiesController.addBranch);
router.put('/:companyId/branches/:branchId', optionalAuth, companiesController.updateBranch);
router.delete('/:companyId/branches/:branchId', optionalAuth, companiesController.deleteBranch);

module.exports = router;

