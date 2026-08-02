const pool = require('../config/db');

const listCompanies = async () => {
  const query = `
    SELECT 
      c.company_id AS "companyId",
      c.company_name AS "companyName",
      c.company_code AS "companyCode",
      c.created_at AS "createdAt",
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'branchId', b.branch_id,
            'branchName', b.branch_name,
            'city', b.city,
            'isHeadquarters', b.is_headquarters
          ) ORDER BY b.is_headquarters DESC, b.branch_name ASC
        ) FILTER (WHERE b.branch_id IS NOT NULL),
        '[]'::json
      ) AS branches,
      COUNT(b.branch_id)::int AS "branchCount"
    FROM companies c
    LEFT JOIN branches b ON b.company_id = c.company_id
    GROUP BY c.company_id, c.company_name, c.company_code, c.created_at
    ORDER BY c.company_name ASC;
  `;

  const result = await pool.query(query);
  return result.rows.map(row => ({
    companyId: row.companyId,
    companyName: row.companyName,
    companyCode: row.companyCode || undefined,
    branchCount: row.branchCount,
    branches: row.branches || [],
    createdAt: row.createdAt
  }));
};

const getCompanyById = async (companyId) => {
  const query = `
    SELECT 
      c.company_id AS "companyId",
      c.company_name AS "companyName",
      c.company_code AS "companyCode",
      c.created_at AS "createdAt",
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'branchId', b.branch_id,
            'branchName', b.branch_name,
            'city', b.city,
            'isHeadquarters', b.is_headquarters
          ) ORDER BY b.is_headquarters DESC, b.branch_name ASC
        ) FILTER (WHERE b.branch_id IS NOT NULL),
        '[]'::json
      ) AS branches,
      COUNT(b.branch_id)::int AS "branchCount"
    FROM companies c
    LEFT JOIN branches b ON b.company_id = c.company_id
    WHERE c.company_id = $1
    GROUP BY c.company_id, c.company_name, c.company_code, c.created_at;
  `;

  const result = await pool.query(query, [companyId]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    companyId: row.companyId,
    companyName: row.companyName,
    companyCode: row.companyCode || undefined,
    branchCount: row.branchCount,
    branches: row.branches || [],
    createdAt: row.createdAt
  };
};

const createCompany = async (data) => {
  const { companyName, companyCode, branches } = data;

  if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2 || companyName.trim().length > 100) {
    const err = new Error('Company name must be between 2 and 100 characters.');
    err.statusCode = 400;
    throw err;
  }

  if (!branches || !Array.isArray(branches) || branches.length < 1) {
    const err = new Error('At least one branch is required for company creation.');
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const compRes = await client.query(
      `INSERT INTO companies (company_name, company_code) VALUES ($1, $2) RETURNING company_id, company_name, company_code, created_at`,
      [companyName.trim(), companyCode ? companyCode.trim() : null]
    );
    const company = compRes.rows[0];

    const insertedBranches = [];
    for (const b of branches) {
      if (!b.branchName || typeof b.branchName !== 'string' || !b.branchName.trim()) {
        const err = new Error('Each branch must have a valid branchName.');
        err.statusCode = 400;
        throw err;
      }

      const branchRes = await client.query(
        `INSERT INTO branches (company_id, branch_name, city, is_headquarters)
         VALUES ($1, $2, $3, $4)
         RETURNING branch_id AS "branchId", branch_name AS "branchName", city, is_headquarters AS "isHeadquarters"`,
        [company.company_id, b.branchName.trim(), b.city ? b.city.trim() : null, !!b.isHeadquarters]
      );
      insertedBranches.push(branchRes.rows[0]);
    }

    await client.query('COMMIT');

    return {
      companyId: company.company_id,
      companyName: company.company_name,
      companyCode: company.company_code || undefined,
      branchCount: insertedBranches.length,
      branches: insertedBranches,
      createdAt: company.created_at
    };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') { // Unique violation
      const error = new Error(`Company "${companyName}" already exists.`);
      error.statusCode = 409;
      throw error;
    }
    throw err;
  } finally {
    client.release();
  }
};

const addBranch = async (companyId, branchData) => {
  const { branchName, city, isHeadquarters } = branchData;

  if (!branchName || typeof branchName !== 'string' || !branchName.trim()) {
    const err = new Error('Branch name is required.');
    err.statusCode = 400;
    throw err;
  }

  const result = await pool.query(
    `INSERT INTO branches (company_id, branch_name, city, is_headquarters)
     VALUES ($1, $2, $3, $4)
     RETURNING branch_id AS "branchId", branch_name AS "branchName", city, is_headquarters AS "isHeadquarters"`,
    [companyId, branchName.trim(), city ? city.trim() : null, !!isHeadquarters]
  );

  return result.rows[0];
};

module.exports = {
  listCompanies,
  getCompanyById,
  createCompany,
  addBranch,
};
