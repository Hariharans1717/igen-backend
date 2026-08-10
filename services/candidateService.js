const pool = require('../config/db');
const googleDriveService = require('./googleDriveService');
const {
  mapEmploymentStatusFromDb,
  normalizeEmploymentStatus,
  mapCandidateStatusFromDb,
  mapCandidateStatusToDb,
} = require('../utils/mappers');
const { serializeHistoryData } = require('../utils/historyUtils');

const formatLocalDate = (value) => {
  if (!(value instanceof Date)) return String(value).slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const maskAadhaar = (aadhaar) => {
  if (!aadhaar) return undefined;
  const digitsOnly = aadhaar.replace(/\D/g, '');
  if (digitsOnly.length >= 4) {
    const last4 = digitsOnly.slice(-4);
    return `XXXX-XXXX-${last4}`;
  }
  return 'XXXX-XXXX-' + aadhaar.slice(-4);
};

const mapCandidateRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  mobile: row.mobile,
  employmentStatus: mapEmploymentStatusFromDb(row.employment_status),
  currentCompany: row.current_company || undefined,
  currentDesignation: row.current_designation || undefined,
  department: row.department || undefined,
  currentCTC: row.current_ctc ? parseFloat(row.current_ctc) : undefined,
  currentCurrency: row.current_currency || 'INR',
  expectedCTC: parseFloat(row.expected_ctc),
  expectedCurrency: row.expected_currency || 'INR',
  expectedHikePercent: row.expected_hike_percent ? parseFloat(row.expected_hike_percent) : undefined,
  aadhaarNumber: row.aadhaar_number || undefined,
  aadhaarMasked: maskAadhaar(row.aadhaar_number),
  aadhaarLast4: row.aadhaar_last4 || (row.aadhaar_number ? row.aadhaar_number.replace(/\D/g, '').slice(-4) : undefined),
  panNumber: row.pan_number || undefined,
  candidateCode: row.candidate_code || undefined,
  dob: row.dob ? formatLocalDate(row.dob) : undefined,
  experience: row.experience_years ? parseFloat(row.experience_years) : undefined,
  preferredLocation: row.preferred_location,
  skills: row.skills || [],
  tags: row.tags || [],
  status: row.is_archived ? 'archived' : mapCandidateStatusFromDb(row.status),
  isDeleted: row.status === 'inactive',
  isArchived: row.is_archived || false,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  noticePeriod: row.notice_period || undefined,
  currentLocation: row.current_location || undefined,
  remarks: row.remarks || undefined,
  photoUrl: row.photo_url || undefined,
  resumeUrl: row.resume_url || undefined,
  resumeFilename: row.resume_filename || undefined,
});

const buildUpdate = (data) => {
  const fieldMap = {
    name: 'name',
    email: 'email',
    mobile: 'mobile',
    employmentStatus: 'employment_status',
    expectedCTC: 'expected_ctc',
    expectedCurrency: 'expected_currency',
    preferredLocation: 'preferred_location',
    skills: 'skills',
    tags: 'tags',
    status: 'status',
    currentCompany: 'current_company',
    currentDesignation: 'current_designation',
    department: 'department',
    currentCTC: 'current_ctc',
    currentCurrency: 'current_currency',
    experience: 'experience_years',
    photoUrl: 'photo_url',
    resumeUrl: 'resume_url',
    resumeFilename: 'resume_filename',
    aadhaarNumber: 'aadhaar_number',
    aadhaarLast4: 'aadhaar_last4',
    panNumber: 'pan_number',
    candidateCode: 'candidate_code',
    dob: 'dob',
    expectedHikePercent: 'expected_hike_percent',
    noticePeriod: 'notice_period',
    currentLocation: 'current_location',
    remarks: 'remarks',
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
  flags,
  isFavourite,
  isFlagged,
  isKey,
  isHot,
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
      c.candidate_code ILIKE $${paramIndex} OR
      c.remarks ILIKE $${paramIndex} OR
      c.department ILIKE $${paramIndex} OR
      c.current_designation ILIKE $${paramIndex} OR
      c.current_company ILIKE $${paramIndex} OR
      EXISTS (SELECT 1 FROM unnest(c.skills) s WHERE s ILIKE $${paramIndex}) OR
      EXISTS (SELECT 1 FROM unnest(c.tags) t WHERE t ILIKE $${paramIndex}) OR
      EXISTS (SELECT 1 FROM candidate_notes cn WHERE cn.candidate_id = c.id AND (cn.note_text ILIKE $${paramIndex} OR cn.title ILIKE $${paramIndex})) OR
      EXISTS (SELECT 1 FROM candidate_timeline ct WHERE ct.candidate_id = c.id AND ct.note ILIKE $${paramIndex})
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

  const requestedFlags = [];
  if (flags) {
    const flagArr = Array.isArray(flags) ? flags : String(flags).split(',').map((f) => f.trim()).filter(Boolean);
    requestedFlags.push(...flagArr);
  }
  if (isFavourite) requestedFlags.push('favourite');
  if (isFlagged) requestedFlags.push('flagged');
  if (isKey) requestedFlags.push('key');
  if (isHot) requestedFlags.push('hot');

  if (requestedFlags.length > 0) {
    const uniqueFlags = Array.from(new Set(requestedFlags));
    whereClauses.push(`c.tags && $${paramIndex}::text[]`);
    params.push(uniqueFlags);
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

  if (!result.rows[0]) return null;

  const candidateObj = mapCandidateRow(result.rows[0]);

  const pipelinesRes = await pool.query(
    `SELECT
       ccp.id AS pipeline_id,
       ccp.company_id,
       ccp.company_name,
       ccp.branch_id,
       b.branch_name,
       ccp.interview_status,
       ccp.sub_status,
       ccp.status_updated_at,
       ccp.updated_at
     FROM candidate_company_pipeline ccp
     LEFT JOIN branches b ON b.branch_id = ccp.branch_id
     WHERE ccp.candidate_id = $1
     ORDER BY ccp.created_at ASC`,
    [id]
  );

  candidateObj.pipelines = pipelinesRes.rows.map(row => ({
    pipeline_id: row.pipeline_id,
    company_id: row.company_id || undefined,
    company_name: row.company_name,
    branch_id: row.branch_id || undefined,
    branch_name: row.branch_name || undefined,
    interview_status: mapCandidateStatusFromDb(row.interview_status),
    sub_status: row.sub_status || undefined,
    status_updated_at: row.status_updated_at,
    updated_at: row.updated_at
  }));

  return candidateObj;
};

const createCandidate = async (data, userId) => {
  // Ensure candidateCode is present for folder naming (e.g. HAR1001)
  const candidateCode = data.candidateCode && data.candidateCode.trim() 
    ? data.candidateCode.trim() 
    : `CAN${Math.floor(1000 + Math.random() * 9000)}`;
  data.candidateCode = candidateCode;

  // Upload files to Google Drive using Candidate Name and Candidate Code (ID)
  const uploadResult = await googleDriveService.uploadCandidateFiles(
    data.name,
    candidateCode,
    data.photoUrl,
    data.resumeUrl,
    data.resumeFilename
  );

  const finalPhotoUrl = uploadResult.photoUrl;
  const finalResumeUrl = uploadResult.resumeUrl;
  const finalResumeFilename = uploadResult.resumeFilename;

  const employmentStatus = normalizeEmploymentStatus(data.employmentStatus);
  const status = mapCandidateStatusToDb(data.status || 'new');
  
  console.log('🗂️ Normalized employmentStatus:', employmentStatus);
  console.log('🗂️ Mapped status:', status);

  // Check if an inactive candidate already exists with the same email or mobile
  const existing = await pool.query(
    "SELECT id, status FROM candidates WHERE email = $1 OR mobile = $2",
    [data.email, data.mobile]
  );
  
  console.log('🔍 Existing candidate check - Found:', existing.rows.length > 0);
  if (existing.rows.length > 0) {
    console.log('📋 Existing candidate:', JSON.stringify(existing.rows[0], null, 2));
  }

  let candidate;

  if (existing.rows.length > 0) {
    const existingCandidate = existing.rows[0];
    if (existingCandidate.status !== 'inactive') {
      console.error('❌ Duplicate detected - active candidate with same email/mobile');
      throw new Error('A candidate with this email or mobile already exists and is active.');
    }
    
    console.log('♻️ Restoring inactive candidate:', existingCandidate.id);
    
    const aadhaarLast4 = data.aadhaarNumber ? data.aadhaarNumber.replace(/\D/g, '').slice(-4) : (data.aadhaarLast4 || null);
    const currentCurrency = data.currentCurrency || 'INR';
    const expectedCurrency = data.expectedCurrency || 'INR';

    // Restore and update the inactive candidate
    const result = await pool.query(
      `UPDATE candidates SET 
        name=$1, email=$2, mobile=$3, employment_status=$4, expected_ctc=$5, preferred_location=$6,
        skills=$7, current_company=$8, current_designation=$9, current_ctc=$10, experience_years=$11,
        status=$12, created_by=$13, updated_at=NOW(),
        photo_url=$14, resume_url=$15, resume_filename=$16,
        aadhaar_number=$17, aadhaar_last4=$18, pan_number=$19, current_currency=$20, expected_currency=$21,
        department=$22, notice_period=$23, current_location=$24, remarks=$25,
        candidate_code=$26, dob=$27, expected_hike_percent=$28
       WHERE id=$29 RETURNING *`,
      [
        data.name, data.email, data.mobile, employmentStatus, data.expectedCTC, data.preferredLocation,
        data.skills, data.currentCompany || null, data.currentDesignation || null, data.currentCTC || null, data.experience || null,
        status, userId, finalPhotoUrl || null, finalResumeUrl || null, finalResumeFilename || null,
        data.aadhaarNumber || null, aadhaarLast4, data.panNumber ? data.panNumber.toUpperCase() : null, currentCurrency, expectedCurrency,
        data.department || null, data.noticePeriod || null, data.currentLocation || null, data.remarks || null,
        data.candidateCode || null, data.dob || null, data.expectedHikePercent != null ? data.expectedHikePercent : null,
        existingCandidate.id
      ]
    );
    
    candidate = result.rows[0];
    console.log('✅ Candidate restored:', candidate.id);

    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
       VALUES ($1, $2, $3, $4)`,
      [candidate.id, userId, 'Candidate Restored', `Profile restored and updated for ${candidate.name}`]
    );
  } else {
    console.log('➕ Creating new candidate');
    const aadhaarLast4 = data.aadhaarNumber ? data.aadhaarNumber.replace(/\D/g, '').slice(-4) : (data.aadhaarLast4 || null);
    const currentCurrency = data.currentCurrency || 'INR';
    const expectedCurrency = data.expectedCurrency || 'INR';

    const result = await pool.query(
      `INSERT INTO candidates (
        name, email, mobile, employment_status, expected_ctc, preferred_location,
        skills, current_company, current_designation, current_ctc, experience_years,
        status, created_by, photo_url, resume_url, resume_filename,
        aadhaar_number, aadhaar_last4, pan_number, current_currency, expected_currency,
        department, notice_period, current_location, remarks, candidate_code, dob, expected_hike_percent
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28) RETURNING *`,
      [
        data.name, data.email, data.mobile, employmentStatus, data.expectedCTC, data.preferredLocation,
        data.skills, data.currentCompany || null, data.currentDesignation || null, data.currentCTC || null, data.experience || null,
        status, userId, finalPhotoUrl || null, finalResumeUrl || null, finalResumeFilename || null,
        data.aadhaarNumber || null, aadhaarLast4, data.panNumber ? data.panNumber.toUpperCase() : null, currentCurrency, expectedCurrency,
        data.department || null, data.noticePeriod || null, data.currentLocation || null, data.remarks || null,
        data.candidateCode || null, data.dob || null, data.expectedHikePercent != null ? data.expectedHikePercent : null
      ]
    );
    
    candidate = result.rows[0];
    console.log('✅ Candidate created:', candidate.id);

    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
       VALUES ($1, $2, $3, $4)`,
      [candidate.id, userId, 'Candidate Created', `Profile created for ${candidate.name}`]
    );
  }

  // Insert into candidate_documents & candidate_salary for normalization compliance
  try {
    if (data.aadhaarNumber || data.panNumber) {
      await pool.query(
        `INSERT INTO candidate_documents (candidate_id, aadhaar_encrypted, aadhaar_last4, pan_number)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (candidate_id) DO UPDATE SET
           aadhaar_encrypted = EXCLUDED.aadhaar_encrypted,
           aadhaar_last4 = EXCLUDED.aadhaar_last4,
           pan_number = EXCLUDED.pan_number`,
        [candidate.id, data.aadhaarNumber || 'MASKED', candidate.aadhaar_last4 || '0000', data.panNumber ? data.panNumber.toUpperCase() : '']
      );
    }

    await pool.query(
      `INSERT INTO candidate_salary (candidate_id, current_ctc, current_currency, expected_ctc, expected_currency, expected_hike_percent)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (candidate_id) DO UPDATE SET
         current_ctc = EXCLUDED.current_ctc,
         current_currency = EXCLUDED.current_currency,
         expected_ctc = EXCLUDED.expected_ctc,
         expected_currency = EXCLUDED.expected_currency,
         expected_hike_percent = EXCLUDED.expected_hike_percent,
         last_updated = NOW()`,
      [candidate.id, data.currentCTC || null, data.currentCurrency || 'INR', data.expectedCTC, data.expectedCurrency || 'INR', data.expectedHikePercent != null ? data.expectedHikePercent : null]
    );
  } catch (subErr) {
    console.error('Warning inserting secondary candidate records:', subErr.message);
  }

  const mappedCandidate = mapCandidateRow(candidate);
  console.log('🎨 Mapped candidate response:', JSON.stringify(mappedCandidate, null, 2));
  
  return mappedCandidate;
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
  if (data.aadhaarNumber) {
    const digitsOnly = data.aadhaarNumber.replace(/\D/g, '');
    if (digitsOnly.length >= 4) {
      updatePayload.aadhaarLast4 = digitsOnly.slice(-4);
    }
  }
  if (data.panNumber) {
    updatePayload.panNumber = data.panNumber.toUpperCase();
  }

  // Handle new file uploads to Google Drive if updated files are base64 strings
  const candidateName = data.name || existing.rows[0].name;
  const candidateIdOrCode = data.candidateCode || existing.rows[0].candidate_code || existing.rows[0].id;

  if ((data.photoUrl && data.photoUrl.startsWith('data:')) || (data.resumeUrl && data.resumeUrl.startsWith('data:'))) {
    console.log(`🔧 [candidateService.updateCandidate] Uploading updated base64 files for ${candidateName} to Google Drive`);
    const uploadResult = await googleDriveService.uploadCandidateFiles(
      candidateName,
      candidateIdOrCode,
      data.photoUrl || existing.rows[0].photo_url,
      data.resumeUrl || existing.rows[0].resume_url,
      data.resumeFilename || existing.rows[0].resume_filename
    );

    if (data.photoUrl && data.photoUrl.startsWith('data:')) {
      updatePayload.photoUrl = uploadResult.photoUrl;
    }
    if (data.resumeUrl && data.resumeUrl.startsWith('data:')) {
      updatePayload.resumeUrl = uploadResult.resumeUrl;
      updatePayload.resumeFilename = uploadResult.resumeFilename;
    }
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
  const oldDataForHistory = serializeHistoryData(oldData);
  const newDataForHistory = serializeHistoryData(updated);

  await pool.query(
    `INSERT INTO candidate_history (candidate_id, changed_by, change_type, old_data, new_data)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, 'update', JSON.stringify(oldDataForHistory), JSON.stringify(newDataForHistory)]
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

const getCandidateHistory = async (candidateId) => {
  const result = await pool.query(
    `SELECT ch.*, CONCAT(u.first_name, ' ', u.last_name) AS changed_by_name
     FROM candidate_history ch
     LEFT JOIN hr_users u ON u.id = ch.changed_by
     WHERE ch.candidate_id = $1
     ORDER BY ch.created_at DESC`,
    [candidateId]
  );

  return result.rows.map(row => ({
    id: row.id,
    candidateId: row.candidate_id,
    changedBy: row.changed_by,
    changedByName: row.changed_by_name || 'System',
    changeType: row.change_type,
    oldData: row.old_data,
    newData: row.new_data,
    createdAt: row.created_at,
  }));
};

const patchCandidateStatus = async (id, rawStatus, userId, companyIdentifier) => {
  const status = mapCandidateStatusToDb(rawStatus);
  let compName = typeof companyIdentifier === 'string' && companyIdentifier.trim() !== ''
    ? companyIdentifier.trim()
    : ((companyIdentifier && (companyIdentifier.company_name || companyIdentifier.companyName)) || 'Candidate Pipeline');
  if (['freelancer', 'freelauncer', 'freelance', 'unemployed', 'student', 'none', 'n/a', 'general', 'main'].includes(compName.toLowerCase().trim())) {
    compName = 'Candidate Pipeline';
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentRes = await client.query('SELECT * FROM candidates WHERE id = $1 AND status != \'inactive\'', [id]);
    if (currentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const prevPipeline = await client.query(
      'SELECT interview_status FROM candidate_company_pipeline WHERE candidate_id = $1 AND company_name = $2',
      [id, compName]
    );
    const previousStatus = prevPipeline.rows[0]?.interview_status || currentRes.rows[0].status;

    await client.query(
      `INSERT INTO candidate_company_pipeline
         (candidate_id, company_name, interview_status, status_updated_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (candidate_id, company_name)
       DO UPDATE SET
         interview_status = EXCLUDED.interview_status,
         status_updated_at = NOW(),
         updated_at = NOW()`,
      [id, compName, status]
    );

    await client.query(
      `INSERT INTO candidate_status_history (candidate_id, company_name, previous_status, new_status, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, compName, previousStatus, status, userId || null]
    );

    await client.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
       VALUES ($1, $2, $3, $4)`,
      [id, userId || null, 'Pipeline Status Updated', `[${compName}] Status changed from ${previousStatus} to ${status}`]
    );

    await client.query(
      `UPDATE candidates SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );

    await client.query('COMMIT');
    return getCandidateById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  listCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  setCandidateStatus,
  patchCandidateStatus,
  softDeleteCandidate,
  checkDuplicate,
  getCandidateHistory,
};
