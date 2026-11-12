const pool = require('../config/db');

const mapEmployee = (row) => ({
  id: row.id,
  candidateId: row.candidate_id,
  employeeName: row.employee_name,
  email: row.email,
  mobile: row.mobile,
  companyName: row.company_name,
  designation: row.designation,
  department: row.department,
  joiningDate: row.joining_date,
  lastWorkingDate: row.last_working_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const findEmployeeByMobile = async (mobile, excludeId) => {
  const cleanMobile = typeof mobile === 'string' ? mobile.trim() : '';
  const digits = cleanMobile.replace(/\D/g, '');
  if (!cleanMobile) return null;

  const params = [cleanMobile];
  let exclusion = '';
  if (excludeId) {
    params.push(excludeId);
    exclusion = ` AND id != $${params.length}`;
  }

  const result = digits.length >= 10
    ? await pool.query(
      `SELECT id FROM employees
       WHERE (
         mobile = $1 OR
         (LENGTH(REGEXP_REPLACE(mobile, '[^0-9]', '', 'g')) >= 10
          AND RIGHT(REGEXP_REPLACE(mobile, '[^0-9]', '', 'g'), 10) = $2)
       )${exclusion}
       LIMIT 1`,
      excludeId ? [cleanMobile, digits.slice(-10), excludeId] : [cleanMobile, digits.slice(-10)]
    )
    : await pool.query(
      `SELECT id FROM employees WHERE mobile = $1${exclusion} LIMIT 1`,
      params
    );

  return result.rows[0] || null;
};

const listEmployees = async ({ page, pageSize, search }) => {
  const offset = (page - 1) * pageSize;
  const params = [];
  let whereClause = '';

  if (search) {
    params.push(`%${search}%`);
    whereClause = `WHERE employee_name ILIKE $1 OR company_name ILIKE $1 OR designation ILIKE $1 OR department ILIKE $1`;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM employees ${whereClause}`,
    params
  );
  const total = Number.parseInt(countResult.rows[0].count, 10);
  const dataResult = await pool.query(
    `SELECT * FROM employees ${whereClause}
     ORDER BY employee_name ASC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  );

  return {
    data: dataResult.rows.map(mapEmployee),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

const createEmployee = async (employee, userId) => {
  if (await findEmployeeByMobile(employee.mobile)) {
    throw new Error('An employee with this mobile number already exists.');
  }

  const result = await pool.query(
    `INSERT INTO employees (
       candidate_id, employee_name, email, mobile, company_name, designation,
       department, joining_date, last_working_date, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      employee.candidateId || null,
      employee.employeeName,
      employee.email || null,
      employee.mobile || null,
      employee.companyName,
      employee.designation || null,
      employee.department || null,
      employee.joiningDate || null,
      employee.lastWorkingDate || null,
      userId || null,
    ]
  );
  return mapEmployee(result.rows[0]);
};

const updateEmployee = async (id, employee) => {
  if (await findEmployeeByMobile(employee.mobile, id)) {
    throw new Error('An employee with this mobile number already exists.');
  }

  const result = await pool.query(
    `UPDATE employees SET
       candidate_id = $1, employee_name = $2, email = $3, mobile = $4,
       company_name = $5, designation = $6, department = $7, joining_date = $8,
       last_working_date = $9, updated_at = NOW()
     WHERE id = $10
     RETURNING *`,
    [
      employee.candidateId || null,
      employee.employeeName,
      employee.email || null,
      employee.mobile || null,
      employee.companyName,
      employee.designation || null,
      employee.department || null,
      employee.joiningDate || null,
      employee.lastWorkingDate || null,
      id,
    ]
  );
  return result.rows[0] ? mapEmployee(result.rows[0]) : null;
};

const deleteEmployee = async (id) => {
  const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
};

module.exports = { listEmployees, createEmployee, updateEmployee, deleteEmployee };