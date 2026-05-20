const pool = require('../config/db');
const { mapInterviewResultToDb, mapInterviewResultFromDb } = require('../utils/mappers');

const INTERVIEW_SELECT = `
  SELECT iv.*,
    COALESCE(cs.candidate_id, iv.candidate_id_uuid) AS candidate_id,
    COALESCE(c.name, iv.candidate_name) AS candidate_name,
    cs.client_company AS company_name,
    cs.submission_date AS resume_submission_date,
    COALESCE(TO_CHAR(iv.interview_time, 'HH24:MI'), TO_CHAR(iv.interview_date, 'HH24:MI')) AS interview_time,
    iv.role,
    iv.department
  FROM interviews iv
  LEFT JOIN candidate_submissions cs ON cs.id = iv.submission_id
  LEFT JOIN candidates c ON c.id = cs.candidate_id OR c.id = iv.candidate_id_uuid
`;

const toDbMode = (mode) => {
  if (mode === 'offline') return 'in_person';
  if (mode === 'online') return 'virtual';
  if (mode === 'telephonic') return 'telephone';
  return mode;
};

const fromDbMode = (mode) => {
  if (mode === 'in_person') return 'offline';
  if (mode === 'virtual') return 'online';
  if (mode === 'telephone') return 'telephonic';
  return mode;
};

const mapInterviewRow = (row) => ({
  id: row.id,
  submissionId: row.submission_id,
  candidateId: row.candidate_id || '',
  candidateName: row.candidate_name || '',
  companyName: row.company_name || '',
  resumeSubmissionDate: row.resume_submission_date || '',
  interviewDate: row.interview_date,
  interviewTime: row.interview_time || '',
  round: row.title || row.interview_round,
  interviewType: row.interview_type,
  interviewerName: row.interviewer_name,
  notes: row.recruiter_notes || row.interview_feedback,
  role: row.role,
  department: row.department,
  mode: fromDbMode(row.interview_mode),
  feedback: row.interview_feedback || undefined,
  result: mapInterviewResultFromDb(row.result),
  offeredCTC: row.offered_ctc ? parseFloat(row.offered_ctc) : undefined,
  offerStatus: row.offer_status || undefined,
  joiningDate: row.joining_date || undefined,
  recruiterNotes: row.recruiter_notes || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const listInterviews = async ({ page, pageSize, search }) => {
  const offset = (page - 1) * pageSize;
  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClause = `WHERE (c.name ILIKE $${paramIndex} OR cs.client_company ILIKE $${paramIndex} OR iv.interview_round ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM interviews iv
     LEFT JOIN candidate_submissions cs ON cs.id = iv.submission_id
     LEFT JOIN candidates c ON c.id = cs.candidate_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `${INTERVIEW_SELECT} ${whereClause}
     ORDER BY iv.interview_date DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, pageSize, offset]
  );

  return {
    data: dataResult.rows.map(mapInterviewRow),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

const getInterviewsByCandidate = async (candidateId) => {
  const result = await pool.query(
    `${INTERVIEW_SELECT} WHERE cs.candidate_id = $1 ORDER BY iv.interview_date DESC`,
    [candidateId]
  );
  return result.rows.map(mapInterviewRow);
};

const updateCandidateStatus = async (candidateId, nextStatus) => {
  const current = await pool.query('SELECT status FROM candidates WHERE id = $1', [candidateId]);
  const currentStatus = current.rows[0]?.status;
  if (!currentStatus) return;

  if (currentStatus === 'archived') return;
  if ((currentStatus === 'joined' || currentStatus === 'rejected') && nextStatus !== 'joined') return;

  await pool.query('UPDATE candidates SET status = $1 WHERE id = $2', [nextStatus, candidateId]);
};

const updateSubmissionFromInterview = async ({ submissionId, offeredCTC, joiningDate, notes, status }) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (offeredCTC !== undefined) setField('offer_ctc', offeredCTC);
  if (joiningDate !== undefined) setField('joining_date', joiningDate);
  if (notes !== undefined) setField('notes', notes);
  if (status) setField('status', status);

  if (fields.length === 0) return;

  await pool.query(
    `UPDATE candidate_submissions SET ${fields.join(', ')} WHERE id = $${index}`,
    [...values, submissionId]
  );
};

const derivePipelineStatus = ({ result, offerStatus, joiningDate, offeredCTC }) => {
  if (joiningDate) return { submissionStatus: 'joined', candidateStatus: 'joined' };
  if (offerStatus === 'accepted') return { submissionStatus: 'offer_accepted', candidateStatus: 'offered' };
  if (offerStatus === 'declined') return { submissionStatus: 'rejected', candidateStatus: 'rejected' };
  if (offerStatus === 'pending' || offeredCTC) return { submissionStatus: 'offered', candidateStatus: 'offered' };
  if (result === 'rejected') return { submissionStatus: 'Interview Failed', candidateStatus: 'rejected' };
  if (result === 'cleared') return { submissionStatus: 'Interview Passed', candidateStatus: 'interview_scheduled' };
  if (result === 'no_show' || result === 'rescheduled') return { submissionStatus: 'interview_scheduled', candidateStatus: 'interview_scheduled' };
  return { submissionStatus: 'interview_scheduled', candidateStatus: 'interview_scheduled' };
};

const createInterview = async (data, userId) => {
  const dbMode = toDbMode(data.mode);
  const dbResult = mapInterviewResultToDb(data.result || 'pending');

  const insertResult = await pool.query(
    `INSERT INTO interviews (
      submission_id, interview_date, interview_round, interview_mode,
      interview_feedback, result, offered_ctc, offer_status,
      joining_date, recruiter_notes,
      title, interview_time, interview_type, interviewer_name,
      candidate_id_uuid, candidate_id_int, candidate_name, role, department
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
    [
      data.submissionId,
      data.interviewDate || data.interview_date,
      data.round || data.title,
      dbMode,
      data.feedback || null,
      dbResult,
      data.offeredCTC || null,
      data.offerStatus || null,
      data.joiningDate || null,
      data.notes || data.recruiterNotes || null,
      data.title || data.round,
      data.interview_time || null,
      data.interview_type || null,
      data.interviewer_name || null,
      typeof data.candidate_id === 'string' && data.candidate_id.length > 10 ? data.candidate_id : null,
      typeof data.candidate_id === 'number' || (typeof data.candidate_id === 'string' && data.candidate_id.length <= 10) ? parseInt(data.candidate_id) : null,
      data.candidate_name || null,
      data.role || null,
      data.department || null,
    ]
  );

  const enriched = await pool.query(`${INTERVIEW_SELECT} WHERE iv.id = $1`, [insertResult.rows[0].id]);
  const interview = enriched.rows[0];

  const pipeline = derivePipelineStatus({
    result: mapInterviewResultFromDb(dbResult),
    offerStatus: data.offerStatus,
    joiningDate: data.joiningDate,
    offeredCTC: data.offeredCTC,
  });

  await updateSubmissionFromInterview({
    submissionId: data.submissionId,
    offeredCTC: data.offeredCTC,
    joiningDate: data.joiningDate,
    notes: data.recruiterNotes,
    status: pipeline.submissionStatus,
  });

  if (interview.candidate_id) {
    await updateCandidateStatus(interview.candidate_id, pipeline.candidateStatus);
    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note, related_company)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        interview.candidate_id,
        userId,
        `${data.round} at ${interview.company_name}`,
        'Interview scheduled',
        interview.company_name,
      ]
    );
  }

  return mapInterviewRow(interview);
};

const updateInterview = async (id, data) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (Object.prototype.hasOwnProperty.call(data, 'interviewDate')) setField('interview_date', data.interviewDate);
  if (Object.prototype.hasOwnProperty.call(data, 'round')) setField('interview_round', data.round);
  if (Object.prototype.hasOwnProperty.call(data, 'mode')) setField('interview_mode', toDbMode(data.mode));
  if (Object.prototype.hasOwnProperty.call(data, 'feedback')) setField('interview_feedback', data.feedback);
  if (Object.prototype.hasOwnProperty.call(data, 'result')) setField('result', mapInterviewResultToDb(data.result));
  if (Object.prototype.hasOwnProperty.call(data, 'offeredCTC')) setField('offered_ctc', data.offeredCTC);
  if (Object.prototype.hasOwnProperty.call(data, 'offerStatus')) setField('offer_status', data.offerStatus);
  if (Object.prototype.hasOwnProperty.call(data, 'joiningDate')) setField('joining_date', data.joiningDate);
  if (Object.prototype.hasOwnProperty.call(data, 'recruiterNotes')) setField('recruiter_notes', data.recruiterNotes);

  if (fields.length === 0) return null;

  const result = await pool.query(
    `UPDATE interviews SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
    [...values, id]
  );

  if (result.rows.length === 0) return null;

  const enriched = await pool.query(`${INTERVIEW_SELECT} WHERE iv.id = $1`, [id]);
  const row = enriched.rows[0];

  const pipeline = derivePipelineStatus({
    result: mapInterviewResultFromDb(row.result),
    offerStatus: row.offer_status,
    joiningDate: row.joining_date,
    offeredCTC: row.offered_ctc,
  });

  await updateSubmissionFromInterview({
    submissionId: row.submission_id,
    offeredCTC: row.offered_ctc,
    joiningDate: row.joining_date,
    notes: row.recruiter_notes,
    status: pipeline.submissionStatus,
  });

  if (row.candidate_id) {
    await updateCandidateStatus(row.candidate_id, pipeline.candidateStatus);
  }

  return mapInterviewRow(row);
};

const deleteInterview = async (id) => {
  const result = await pool.query('DELETE FROM interviews WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
};

module.exports = {
  listInterviews,
  getInterviewsByCandidate,
  createInterview,
  updateInterview,
  deleteInterview,
};
