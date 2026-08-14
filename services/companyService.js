const pool = require('../config/db');

const toProperCase = (str) => {
  if (!str) return '';
  return str.replace(/\b\w+/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

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
    companyName: toProperCase(row.companyName),
    companyCode: row.companyCode || undefined,
    branchCount: row.branchCount,
    branches: (row.branches || []).map(b => ({ ...b, branchName: toProperCase(b.branchName), city: toProperCase(b.city) })),
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
    companyName: toProperCase(row.companyName),
    companyCode: row.companyCode || undefined,
    branchCount: row.branchCount,
    branches: (row.branches || []).map(b => ({ ...b, branchName: toProperCase(b.branchName), city: toProperCase(b.city) })),
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

  // Enforce single HQ: pick last marked HQ or default to first branch
  let hqIdx = branches.findLastIndex(b => b.isHeadquarters);
  if (hqIdx === -1) hqIdx = 0;
  const processedBranches = branches.map((b, idx) => ({
    ...b,
    isHeadquarters: idx === hqIdx
  }));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const compRes = await client.query(
      `INSERT INTO companies (company_name, company_code) VALUES ($1, $2) RETURNING company_id, company_name, company_code, created_at`,
      [toProperCase(companyName.trim()), companyCode ? companyCode.trim() : null]
    );
    const company = compRes.rows[0];

    const insertedBranches = [];
    for (const b of processedBranches) {
      if (!b.branchName || typeof b.branchName !== 'string' || !b.branchName.trim()) {
        const err = new Error('Each branch must have a valid branchName.');
        err.statusCode = 400;
        throw err;
      }

      const branchRes = await client.query(
        `INSERT INTO branches (company_id, branch_name, city, is_headquarters)
         VALUES ($1, $2, $3, $4)
         RETURNING branch_id AS "branchId", branch_name AS "branchName", city, is_headquarters AS "isHeadquarters"`,
        [company.company_id, toProperCase(b.branchName.trim()), b.city ? toProperCase(b.city.trim()) : null, !!b.isHeadquarters]
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

  // If new branch is marked HQ, reset existing branches HQ flag for this company
  if (isHeadquarters) {
    await pool.query(`UPDATE branches SET is_headquarters = FALSE WHERE company_id = $1`, [companyId]);
  }

  const result = await pool.query(
    `INSERT INTO branches (company_id, branch_name, city, is_headquarters)
     VALUES ($1, $2, $3, $4)
     RETURNING branch_id AS "branchId", branch_name AS "branchName", city, is_headquarters AS "isHeadquarters"`,
    [companyId, toProperCase(branchName.trim()), city ? toProperCase(city.trim()) : null, !!isHeadquarters]
  );

  return result.rows[0];
};

const updateCompany = async (companyId, data) => {
  const { companyName, companyCode, branches } = data;

  if (companyName && (typeof companyName !== 'string' || companyName.trim().length < 2 || companyName.trim().length > 100)) {
    const err = new Error('Company name must be between 2 and 100 characters.');
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update company row
    const compRes = await client.query(
      `UPDATE companies 
       SET company_name = COALESCE($1, company_name),
           company_code = COALESCE($2, company_code)
       WHERE company_id = $3
       RETURNING company_id, company_name, company_code, created_at`,
      [
        companyName ? toProperCase(companyName.trim()) : null,
        companyCode !== undefined ? (companyCode ? companyCode.trim() : null) : null,
        companyId
      ]
    );

    if (compRes.rows.length === 0) {
      const err = new Error('Company not found');
      err.statusCode = 404;
      throw err;
    }

    // 2. If branches list provided, sync branches ensuring single HQ
    if (branches && Array.isArray(branches)) {
      let hqIdx = branches.findLastIndex(b => b.isHeadquarters);
      if (hqIdx === -1 && branches.length > 0) hqIdx = 0;
      const normalizedBranches = branches.map((b, idx) => ({
        ...b,
        isHeadquarters: idx === hqIdx
      }));

      const existingRes = await client.query(`SELECT branch_id FROM branches WHERE company_id = $1`, [companyId]);
      const existingIds = existingRes.rows.map(r => r.branch_id);
      const keepBranchIds = [];

      for (const b of normalizedBranches) {
        if (b.branchId && existingIds.includes(b.branchId)) {
          await client.query(
            `UPDATE branches 
             SET branch_name = $1, city = $2, is_headquarters = $3 
             WHERE branch_id = $4 AND company_id = $5`,
            [toProperCase(b.branchName.trim()), b.city ? toProperCase(b.city.trim()) : null, !!b.isHeadquarters, b.branchId, companyId]
          );
          keepBranchIds.push(b.branchId);
        } else if (b.branchName && b.branchName.trim()) {
          const newB = await client.query(
            `INSERT INTO branches (company_id, branch_name, city, is_headquarters)
             VALUES ($1, $2, $3, $4)
             RETURNING branch_id`,
            [companyId, toProperCase(b.branchName.trim()), b.city ? toProperCase(b.city.trim()) : null, !!b.isHeadquarters]
          );
          keepBranchIds.push(newB.rows[0].branch_id);
        }
      }

      if (keepBranchIds.length > 0) {
        await client.query(
          `DELETE FROM branches WHERE company_id = $1 AND NOT (branch_id = ANY($2::uuid[]))`,
          [companyId, keepBranchIds]
        );
      }
    }

    await client.query('COMMIT');
    return await getCompanyById(companyId);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      const error = new Error(`Company name or code conflict.`);
      error.statusCode = 409;
      throw error;
    }
    throw err;
  } finally {
    client.release();
  }
};

const deleteCompany = async (companyId) => {
  const result = await pool.query(`DELETE FROM companies WHERE company_id = $1 RETURNING company_id`, [companyId]);
  if (result.rows.length === 0) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }
  return true;
};

const updateBranch = async (companyId, branchId, branchData) => {
  const { branchName, city, isHeadquarters } = branchData;

  if (branchName && (typeof branchName !== 'string' || !branchName.trim())) {
    const err = new Error('Branch name cannot be empty.');
    err.statusCode = 400;
    throw err;
  }

  if (isHeadquarters === true) {
    await pool.query(`UPDATE branches SET is_headquarters = FALSE WHERE company_id = $1 AND branch_id != $2`, [companyId, branchId]);
  }

  const result = await pool.query(
    `UPDATE branches 
     SET branch_name = COALESCE($1, branch_name),
         city = COALESCE($2, city),
         is_headquarters = COALESCE($3, is_headquarters)
     WHERE branch_id = $4 AND company_id = $5
     RETURNING branch_id AS "branchId", branch_name AS "branchName", city, is_headquarters AS "isHeadquarters"`,
    [
      branchName ? toProperCase(branchName.trim()) : null,
      city !== undefined ? (city ? toProperCase(city.trim()) : null) : null,
      isHeadquarters !== undefined ? !!isHeadquarters : null,
      branchId,
      companyId
    ]
  );

  if (result.rows.length === 0) {
    const err = new Error('Branch not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
};

const deleteBranch = async (companyId, branchId) => {
  const bRes = await pool.query(`SELECT is_headquarters FROM branches WHERE branch_id = $1 AND company_id = $2`, [branchId, companyId]);
  const wasHq = bRes.rows[0]?.is_headquarters;

  const result = await pool.query(
    `DELETE FROM branches WHERE branch_id = $1 AND company_id = $2 RETURNING branch_id`,
    [branchId, companyId]
  );
  if (result.rows.length === 0) {
    const err = new Error('Branch not found');
    err.statusCode = 404;
    throw err;
  }

  if (wasHq) {
    await pool.query(
      `UPDATE branches SET is_headquarters = TRUE 
       WHERE company_id = $1 AND branch_id = (SELECT branch_id FROM branches WHERE company_id = $1 LIMIT 1)`,
      [companyId]
    );
  }

  return true;
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

