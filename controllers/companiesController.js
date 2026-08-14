const companyService = require('../services/companyService');

const listCompanies = async (req, res, next) => {
  try {
    const companies = await companyService.listCompanies();
    return res.json(companies);
  } catch (err) {
    next(err);
  }
};

const getCompanyById = async (req, res, next) => {
  try {
    const company = await companyService.getCompanyById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });
    return res.json(company);
  } catch (err) {
    next(err);
  }
};

const createCompany = async (req, res, next) => {
  try {
    const company = await companyService.createCompany(req.body);
    return res.status(201).json(company);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

const addBranch = async (req, res, next) => {
  try {
    const branch = await companyService.addBranch(req.params.companyId, req.body);
    return res.status(201).json(branch);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    const company = await companyService.updateCompany(req.params.id, req.body);
    return res.json(company);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

const deleteCompany = async (req, res, next) => {
  try {
    await companyService.deleteCompany(req.params.id);
    return res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

const updateBranch = async (req, res, next) => {
  try {
    const branch = await companyService.updateBranch(req.params.companyId, req.params.branchId, req.body);
    return res.json(branch);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

const deleteBranch = async (req, res, next) => {
  try {
    await companyService.deleteBranch(req.params.companyId, req.params.branchId);
    return res.json({ message: 'Branch deleted successfully' });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

module.exports = {
  listCompanies,
  getCompanyById,
  createCompany,
  addBranch,
  updateCompany,
  deleteCompany,
  updateBranch,
  deleteBranch,
};

