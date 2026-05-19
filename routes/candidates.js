// =========================================
// Candidate Routes — CRUD + Filters + Duplicate Check
// =========================================
const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();

// All candidate routes require authentication
router.use(authenticate);

// ---- Helper: Map DB row to frontend Candidate shape ----
function mapCandidate(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    employmentStatus: row.employment_status,
    currentCompany: row.current_company || undefined,
    currentDesignation: row.current_designation || undefined,
    currentCTC: row.current_ctc ? parseFloat(row.current_ctc) : undefined,
    expectedCTC: parseFloat(row.expected_ctc),
    experience: row.experience_years ? parseFloat(row.experience_years) : undefined,
    preferredLocation: row.preferred_location,
    skills: row.skills || [],
    status: row.status,
    isDeleted: row.status === 'inactive',
    isArchived: row.is_archived || false,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---- GET /api/candidates ----
// Paginated list with search, filters, sorting
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, pageSize = 20, search, sortBy, sortOrder = 'asc',
      status, location, experienceMin, experienceMax,
      ctcMin, ctcMax, skills, companyName,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const size = parseInt(pageSize, 10);
    const offset = (pageNum - 1) * size;

    let whereClauses = ["c.status != 'inactive'"]; // Exclude soft-deleted
    let params = [];
    let paramIndex = 1;

    // Search
    if (search) {
      whereClauses.push(`(
        c.name ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex} OR
        c.mobile ILIKE $${paramIndex} OR
        EXISTS (SELECT 1 FROM unnest(c.skills) s WHERE s ILIKE $${paramIndex})
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filters
    if (status) {
      whereClauses.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (location) {
      whereClauses.push(`c.preferred_location = $${paramIndex}`);
      params.push(location);
      paramIndex++;
    }
    if (experienceMin) {
      whereClauses.push(`c.experience_years >= $${paramIndex}`);
      params.push(parseFloat(experienceMin));
      paramIndex++;
    }
    if (experienceMax) {
      whereClauses.push(`c.experience_years <= $${paramIndex}`);
      params.push(parseFloat(experienceMax));
      paramIndex++;
    }
    if (ctcMin) {
      whereClauses.push(`c.expected_ctc >= $${paramIndex}`);
      params.push(parseFloat(ctcMin));
      paramIndex++;
    }
    if (ctcMax) {
      whereClauses.push(`c.expected_ctc <= $${paramIndex}`);
      params.push(parseFloat(ctcMax));
      paramIndex++;
    }
    if (skills) {
      const skillArr = skills.split(',').map(s => s.trim());
      whereClauses.push(`c.skills && $${paramIndex}::text[]`);
      params.push(skillArr);
      paramIndex++;
    }
    if (companyName) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM candidate_submissions cs
        WHERE cs.candidate_id = c.id AND cs.client_company = $${paramIndex}
      )`);
      params.push(companyName);
      paramIndex++;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Sorting
    const allowedSortFields = ['name', 'email', 'status', 'expected_ctc', 'experience_years', 'preferred_location', 'created_at'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM candidates c ${whereSQL}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch page
    const dataResult = await pool.query(
      `SELECT c.*, 
        CASE WHEN EXISTS (SELECT 1 FROM greyhr_archive ga WHERE ga.candidate_id = c.id) THEN true ELSE false END as is_archived
       FROM candidates c
       ${whereSQL}
       ORDER BY c.${sortField} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, size, offset]
    );

    const data = dataResult.rows.map(mapCandidate);

    res.json({
      data,
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    });
  } catch (err) {
    console.error('Get candidates error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- GET /api/candidates/:id ----
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
        CASE WHEN EXISTS (SELECT 1 FROM greyhr_archive ga WHERE ga.candidate_id = c.id) THEN true ELSE false END as is_archived
       FROM candidates c WHERE c.id = $1 AND c.status != 'inactive'`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    res.json(mapCandidate(result.rows[0]));
  } catch (err) {
    console.error('Get candidate error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- POST /api/candidates ----
router.post('/', async (req, res) => {
  try {
    const {
      name, email, mobile, employmentStatus, expectedCTC, preferredLocation,
      skills, currentCompany, currentDesignation, currentCTC, experience, status,
    } = req.body;

    if (!name || !email || !mobile || !employmentStatus || !expectedCTC || !preferredLocation || !skills) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const result = await pool.query(
      `INSERT INTO candidates (
        name, email, mobile, employment_status, expected_ctc, preferred_location,
        skills, current_company, current_designation, current_ctc, experience_years,
        status, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        name, email, mobile, employmentStatus, expectedCTC, preferredLocation,
        skills, currentCompany || null, currentDesignation || null,
        currentCTC || null, experience || null,
        status || 'active', req.user.id,
      ]
    );

    const candidate = result.rows[0];

    // Add timeline entry
    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
       VALUES ($1, $2, $3, $4)`,
      [candidate.id, req.user.id, 'Candidate Created', `Profile created for ${name}`]
    );

    res.status(201).json(mapCandidate(candidate));
  } catch (err) {
    if (err.code === '23505') {
      // Unique violation
      return res.status(409).json({ error: 'Candidate with this email or mobile already exists.' });
    }
    console.error('Create candidate error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- PUT /api/candidates/:id ----
router.put('/:id', async (req, res) => {
  try {
    const {
      name, email, mobile, employmentStatus, expectedCTC, preferredLocation,
      skills, currentCompany, currentDesignation, currentCTC, experience, status,
    } = req.body;

    // Check candidate exists
    const existing = await pool.query(
      "SELECT * FROM candidates WHERE id = $1 AND status != 'inactive'",
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    const oldData = existing.rows[0];

    const result = await pool.query(
      `UPDATE candidates SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        mobile = COALESCE($3, mobile),
        employment_status = COALESCE($4, employment_status),
        expected_ctc = COALESCE($5, expected_ctc),
        preferred_location = COALESCE($6, preferred_location),
        skills = COALESCE($7, skills),
        current_company = $8,
        current_designation = $9,
        current_ctc = $10,
        experience_years = $11,
        status = COALESCE($12, status)
       WHERE id = $13 RETURNING *`,
      [
        name, email, mobile, employmentStatus, expectedCTC, preferredLocation,
        skills, currentCompany || null, currentDesignation || null,
        currentCTC || null, experience || null, status,
        req.params.id,
      ]
    );

    const updated = result.rows[0];

    // Add timeline entry
    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, req.user.id, 'Profile Updated', 'Candidate profile updated']
    );

    // Add history entry
    await pool.query(
      `INSERT INTO candidate_history (candidate_id, changed_by, change_type, old_data, new_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, req.user.id, 'update', JSON.stringify(oldData), JSON.stringify(updated)]
    );

    res.json(mapCandidate(updated));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Candidate with this email or mobile already exists.' });
    }
    console.error('Update candidate error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- DELETE /api/candidates/:id ----
// Soft delete — sets status to 'inactive'
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE candidates SET status = 'inactive' WHERE id = $1 AND status != 'inactive' RETURNING id",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    // Add timeline entry
    await pool.query(
      `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, req.user.id, 'Candidate Deleted', 'Candidate profile soft-deleted']
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Delete candidate error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- POST /api/candidates/check-duplicate ----
router.post('/check-duplicate', async (req, res) => {
  try {
    const { email, mobile, excludeId } = req.body;

    if (!email && !mobile) {
      return res.status(400).json({ error: 'Email or mobile is required.' });
    }

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
      if (emailExists) candidate = mapCandidate(result.rows[0]);
    }

    if (mobile) {
      const result = await pool.query(
        "SELECT * FROM candidates WHERE mobile = $1 AND status != 'inactive'" +
        (excludeId ? ' AND id != $2' : ''),
        excludeId ? [mobile, excludeId] : [mobile]
      );
      mobileExists = result.rows.length > 0;
      if (mobileExists && !candidate) candidate = mapCandidate(result.rows[0]);
    }

    res.json({ emailExists, mobileExists, candidate: candidate || undefined });
  } catch (err) {
    console.error('Check duplicate error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
