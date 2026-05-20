const pool = require('../config/db');
const {
  mapEmploymentStatusFromDb,
  normalizeEmploymentStatus,
  mapCandidateStatusFromDb,
  mapCandidateStatusToDb,
} = require('../utils/mappers');

const mapCandidateRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  mobile: row.mobile,
  employmentStatus: mapEmploymentStatusFromDb(row.employment_status),
  currentCompany: row.current_company || undefined,
  currentDesignation: row.current_designation || undefined,
  currentCTC: row.current_ctc ? parseFloat(row.current_ctc) : undefined,
  expectedCTC: parseFloat(row.expected_ctc),
  experience: row.experience_years ? parseFloat(row.experience_years) : undefined,
  preferredLocation: row.preferred_location,
  skills: row.skills || [],
  status: row.is_archived ? 'archived' : mapCandidateStatusFromDb(row.status),
  isDeleted: row.status === 'inactive',
  isArchived: row.is_archived || false,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const buildUpdate = (data) => {
  const fieldMap = {
    name: 'name',
    email: 'email',
    mobile: 'mobile',
    employmentStatus: 'employment_status',
    expectedCTC: 'expected_ctc',
    preferredLocation: 'preferred_location',
    skills: 'skills',
    status: 'status',
    currentCompany: 'current_company',
    currentDesignation: 'current_designation',
    currentCTC: 'current_ctc',
    experience: 'experience_years',
  };

  const keys = Object.keys(fieldMap).filter((key) => Object.prototype.hasOwnProperty.call(data, key));
  const assignments = [];
  const values = [];

  keys.forEach((key, index) => {
    assignments.push(`${fieldMap[key]} = $${index + 1}`);
    values.push(data[key]);
  });

  return { assignments, values };
};

const listCandidates = async ({
  page,
  pageSize,
  search,
  sortBy,
  sortOrder,
  status,
  location,
  experienceMin,
  experienceMax,
  ctcMin,
  ctcMax,
  skills,
  companyName,
}) => {
  const offset = (page - 1) * pageSize;
  const whereClauses = ["c.status != 'inactive'"];
  if (!status || status !== 'archived') {
    whereClauses.push("c.status != 'archived'");
  }
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClauses.push(`(
      c.name ILIKE $${paramIndex} OR
      c.email ILIKE $${paramIndex} OR
      c.mobile ILIKE $${paramIndex} OR
      EXISTS (SELECT 1 FROM unnest(c.skills) s WHERE s ILIKE $${paramIndex})
    )`);
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  if (status) {
    if (status === 'archived') {
      whereClauses.push('EXISTS (SELECT 1 FROM greyhr_archive ga WHERE ga.candidate_id = c.id)');
    } else {
      whereClauses.push(`c.status = $${paramIndex}`);
      params.push(mapCandidateStatusToDb(status));
      paramIndex += 1;
    }
  }

  if (location) {
    whereClauses.push(`c.preferred_location = $${paramIndex}`);
    params.push(location);
    paramIndex += 1;
  }

  if (experienceMin !== undefined) {
    whereClauses.push(`c.experience_years >= $${paramIndex}`);
    params.push(experienceMin);
    paramIndex += 1;
  }

  if (experienceMax !== undefined) {
    whereClauses.push(`c.experience_years <= $${paramIndex}`);
    params.push(experienceMax);
    paramIndex += 1;
  }

  if (ctcMin !== undefined) {
    whereClauses.push(`c.expected_ctc >= $${paramIndex}`);
    params.push(ctcMin);
    paramIndex += 1;
  }

  if (ctcMax !== undefined) {
    whereClauses.push(`c.expected_ctc <= $${paramIndex}`);
    params.push(ctcMax);
    paramIndex += 1;
  }

  if (skills) {
    const skillArr = skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (skillArr.length > 0) {
      whereClauses.push(`c.skills && $${paramIndex}::text[]`);
      params.push(skillArr);
      paramIndex += 1;
    }
  }

  if (companyName) {
    whereClauses.push(`EXISTS (
      SELECT 1 FROM candidate_submissions cs
      WHERE cs.candidate_id = c.id AND cs.client_company = $${paramIndex}
    )`);
    params.push(companyName);
    paramIndex += 1;
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const allowedSortFields = {
    name: 'name',
    email: 'email',
    status: 'status',
    expected_ctc: 'expected_ctc',
    expectedCTC: 'expected_ctc',
    experience_years: 'experience_years',
    experience: 'experience_years',
    preferred_location: 'preferred_location',
    preferredLocation: 'preferred_location',
    created_at: 'created_at',
    createdAt: 'created_at',
  };
  const sortField = allowedSortFields[sortBy] || 'created_at';
  const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM candidates c ${whereSQL}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT c.*,
      CASE WHEN EXISTS (SELECT 1 FROM greyhr_archive ga WHERE ga.candidate_id = c.id) THEN true ELSE false END AS is_archived
     FROM candidates c
     ${whereSQL}
     ORDER BY c.${sortField} ${order}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, pageSize, offset]
  );

  return {
    data: dataResult.rows.map(mapCandidateRow),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

const getCandidateById = async (id) => {
  const result = await pool.query(
    `SELECT c.*,
      CASE WHEN EXISTS (SELECT 1 FROM greyhr_archive ga WHERE ga.candidate_id = c.id) THEN true ELSE false END AS is_archived
     FROM candidates c
     WHERE c.id = $1 AND c.status != 'inactive'`,
    [id]
  );

  return result.rows[0] ? mapCandidateRow(result.rows[0]) : null;
};

const createCandidate = async (data, userId) => {
  const employmentStatus = normalizeEmploymentStatus(data.employmentStatus);
  const status = mapCandidateStatusToDb(data.status || 'new');

  // Check if an inactive candidate already exists with the same email or mobile
  const existing = await pool.query(
    "SELECT id, status FROM candidates WHERE email = $1 OR mobile = $2",
    [data.email, data.mobile]
  );

  let candidate;

  if (existing.rows.length > 0) {
    const existingCandidate = existing.rows[0];
    if (existingCandidate.status !== 'inactive') {
      throw new Error('A candidate with this email or mobile already exists and is active.');
    }
    // Restore and update the inactive candidate
    const result = await pool.query(
      `UPDATE candidates SET 
        name=$1, email=$2, mobile=$3, employment_status=$4, expected_ctc=$5, preferred_location=$6,
        skills=$7, current_company=$8, current_designation=$9, current_ctc=$10, experience_years=$11,
        status=$12, created_by=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [
        data.name, data.email, data.mobile, employmentStatus, data.expectedCTC, data.preferredLocation,
        data.skills, data.currentCompany || null, data.currentDesignation || null, data.currentCTC || null, data.experience || null,
        status, userId, existingCandidate.id
      ]
    );
    candidate = result.rows[0];

    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
       VALUES ($1, $2, $3, $4)`,
      [candidate.id, userId, 'Candidate Restored', `Profile restored and updated for ${candidate.name}`]
    );
  } else {
    const result = await pool.query(
      `INSERT INTO candidates (
        name, email, mobile, employment_status, expected_ctc, preferred_location,
        skills, current_company, current_designation, current_ctc, experience_years,
        status, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        data.name, data.email, data.mobile, employmentStatus, data.expectedCTC, data.preferredLocation,
        data.skills, data.currentCompany || null, data.currentDesignation || null, data.currentCTC || null, data.experience || null,
        status, userId,
      ]
    );
    candidate = result.rows[0];

    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
       VALUES ($1, $2, $3, $4)`,
      [candidate.id, userId, 'Candidate Created', `Profile created for ${candidate.name}`]
    );
  }

  return mapCandidateRow(candidate);
};

const updateCandidate = async (id, data, userId) => {
  const existing = await pool.query(
    "SELECT * FROM candidates WHERE id = $1 AND status != 'inactive'",
    [id]
  );
  if (existing.rows.length === 0) return null;

  const updatePayload = { ...data };
  if (Object.prototype.hasOwnProperty.call(data, 'employmentStatus')) {
    updatePayload.employmentStatus = normalizeEmploymentStatus(data.employmentStatus);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'status')) {
    updatePayload.status = mapCandidateStatusToDb(data.status);
  }

  const { assignments, values } = buildUpdate(updatePayload);
  if (assignments.length === 0) return mapCandidateRow(existing.rows[0]);

  const result = await pool.query(
    `UPDATE candidates SET ${assignments.join(', ')} WHERE id = $${values.length + 1} RETURNING *`,
    [...values, id]
  );

  const updated = result.rows[0];

  await pool.query(
    `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
     VALUES ($1, $2, $3, $4)`,
    [id, userId, 'Profile Updated', 'Candidate profile updated']
  );

  const oldData = existing.rows[0];
  await pool.query(
    `INSERT INTO candidate_history (candidate_id, changed_by, change_type, old_data, new_data)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, 'update', JSON.stringify(oldData), JSON.stringify(updated)]
  );

  if (data.status && data.status !== oldData.status) {
    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, 'Status Updated', `Status changed to ${data.status}`]
    );
  }

  return mapCandidateRow(updated);
};

const setCandidateStatus = async (id, status) => {
  const current = await pool.query('SELECT status FROM candidates WHERE id = $1', [id]);
  if (current.rows[0]?.status === 'archived') return;

  await pool.query(
    'UPDATE candidates SET status = $1 WHERE id = $2',
    [mapCandidateStatusToDb(status), id]
  );
};

const softDeleteCandidate = async (id, userId) => {
  const result = await pool.query(
    "UPDATE candidates SET status = 'inactive' WHERE id = $1 AND status != 'inactive' RETURNING id",
    [id]
  );

  if (result.rows.length === 0) return false;

  await pool.query(
    `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
     VALUES ($1, $2, $3, $4)`,
    [id, userId, 'Candidate Deleted', 'Candidate profile soft-deleted']
  );

  return true;
};

const checkDuplicate = async ({ email, mobile, excludeId }) => {
  let emailExists = false;
  let mobileExists = false;
  let candidate = null;

  if (email) {
    const result = await pool.query(
      "SELECT * FROM candidates WHERE email = $1 AND status != 'inactive'" +
      (excludeId ? ' AND id != $2' : ''),
      excludeId ? [email, excludeId] : [email]
    );
    emailExists = result.rows.length > 0;
    if (emailExists) candidate = mapCandidateRow(result.rows[0]);
  }

  if (mobile) {
    const result = await pool.query(
      "SELECT * FROM candidates WHERE mobile = $1 AND status != 'inactive'" +
      (excludeId ? ' AND id != $2' : ''),
      excludeId ? [mobile, excludeId] : [mobile]
    );
    mobileExists = result.rows.length > 0;
    if (mobileExists && !candidate) candidate = mapCandidateRow(result.rows[0]);
  }

  return { emailExists, mobileExists, candidate };
};

module.exports = {
  listCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  setCandidateStatus,
  softDeleteCandidate,
  checkDuplicate,
};
