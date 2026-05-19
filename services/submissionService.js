const pool = require('../config/db');
const { mapSubmissionStatusFromDb, mapSubmissionStatusToDb, candidateStatusFromSubmissionStatus } = require('../utils/mappers');
const { setCandidateStatus } = require('./candidateService');

const mapSubmissionRow = (row) => ({
  id: row.id,
  candidateId: row.candidate_id,
  candidateName: row.candidate_name || '',
  companyName: row.client_company,
  submissionDate: row.submission_date,
  recruiterId: row.submitted_by,
  recruiterName: row.recruiter_name || '',
  status: mapSubmissionStatusFromDb(row.status),
  offerCTC: row.offer_ctc ? parseFloat(row.offer_ctc) : undefined,
  joiningDate: row.joining_date || undefined,
  notes: row.notes || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const SUBMISSION_SELECT = `
  SELECT cs.*, c.name AS candidate_name, CONCAT(u.first_name, ' ', u.last_name) AS recruiter_name
  FROM candidate_submissions cs
  LEFT JOIN candidates c ON c.id = cs.candidate_id
  LEFT JOIN hr_users u ON u.id = cs.submitted_by
`;

const listSubmissions = async ({ page, pageSize, search }) => {
  const offset = (page - 1) * pageSize;
  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClause = `WHERE (c.name ILIKE $${paramIndex} OR cs.client_company ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM candidate_submissions cs
     LEFT JOIN candidates c ON c.id = cs.candidate_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `${SUBMISSION_SELECT} ${whereClause}
     ORDER BY cs.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, pageSize, offset]
  );

  return {
    data: dataResult.rows.map(mapSubmissionRow),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

const getSubmissionsByCandidate = async (candidateId) => {
  const result = await pool.query(
    `${SUBMISSION_SELECT} WHERE cs.candidate_id = $1 ORDER BY cs.created_at DESC`,
    [candidateId]
  );

  return result.rows.map(mapSubmissionRow);
};

const createSubmission = async (data, userId) => {
  const status = mapSubmissionStatusToDb(data.status || 'submitted');

  const result = await pool.query(
    `INSERT INTO candidate_submissions (
      candidate_id, client_company, submitted_by, submission_date, status, offer_ctc, joining_date, notes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      data.candidateId,
      data.companyName,
      userId,
      data.submissionDate || new Date().toISOString().split('T')[0],
      status,
      data.offerCTC || null,
      data.joiningDate || null,
      data.notes || null,
    ]
  );

  const submission = result.rows[0];

  await pool.query(
    `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note, related_company)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.candidateId, userId, `Submitted to ${data.companyName}`, 'Resume submitted', data.companyName]
  );

  const nextStatus = candidateStatusFromSubmissionStatus(status);
  await setCandidateStatus(data.candidateId, nextStatus);

  const enriched = await pool.query(`${SUBMISSION_SELECT} WHERE cs.id = $1`, [submission.id]);
  return mapSubmissionRow(enriched.rows[0]);
};

const updateSubmission = async (id, data) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (Object.prototype.hasOwnProperty.call(data, 'companyName')) {
    setField('client_company', data.companyName);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'submissionDate')) {
    setField('submission_date', data.submissionDate);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'status')) {
    setField('status', mapSubmissionStatusToDb(data.status));
  }
  if (Object.prototype.hasOwnProperty.call(data, 'offerCTC')) {
    setField('offer_ctc', data.offerCTC);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'joiningDate')) {
    setField('joining_date', data.joiningDate);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'notes')) {
    setField('notes', data.notes);
  }

  if (fields.length === 0) return null;

  const result = await pool.query(
    `UPDATE candidate_submissions SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
    [...values, id]
  );

  if (result.rows.length === 0) return null;

  const enriched = await pool.query(`${SUBMISSION_SELECT} WHERE cs.id = $1`, [id]);
  const mapped = mapSubmissionRow(enriched.rows[0]);

  if (Object.prototype.hasOwnProperty.call(data, 'status')) {
    const nextStatus = candidateStatusFromSubmissionStatus(mapped.status);
    await setCandidateStatus(mapped.candidateId, nextStatus);
  }

  return mapped;
};

const deleteSubmission = async (id) => {
  const result = await pool.query('DELETE FROM candidate_submissions WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
};

const checkDuplicateSubmission = async (candidateId, companyName) => {
  const result = await pool.query(
    'SELECT id FROM candidate_submissions WHERE candidate_id = $1 AND client_company = $2',
    [candidateId, companyName]
  );
  return result.rows.length > 0;
};

module.exports = {
  listSubmissions,
  getSubmissionsByCandidate,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  checkDuplicateSubmission,
};
