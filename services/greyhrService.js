const pool = require('../config/db');

const mapArchiveEntry = (row) => ({
  id: row.id,
  candidateId: row.candidate_id,
  candidateName: row.candidate_name || '',
  companyName: row.joined_company,
  joiningDate: row.joining_date || row.archive_date,
  archivedDate: row.archive_date,
  archivedBy: row.archived_by,
  archivedByName: row.archived_by_name || '',
});

const listArchive = async ({ page, pageSize, search }) => {
  const offset = (page - 1) * pageSize;
  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClause = `WHERE (c.name ILIKE $${paramIndex} OR ga.joined_company ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex += 1;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM greyhr_archive ga
     LEFT JOIN candidates c ON c.id = ga.candidate_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT ga.*, c.name AS candidate_name,
      CONCAT(u.first_name, ' ', u.last_name) AS archived_by_name,
      (ga.profile_data->>'joining_date') AS joining_date
     FROM greyhr_archive ga
     LEFT JOIN candidates c ON c.id = ga.candidate_id
     LEFT JOIN hr_users u ON u.id = ga.archived_by
     ${whereClause}
     ORDER BY ga.archive_date DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, pageSize, offset]
  );

  return {
    data: dataResult.rows.map(mapArchiveEntry),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

const archiveCandidate = async ({ candidateId, companyName, joiningDate }, userId) => {
  const candidateResult = await pool.query('SELECT * FROM candidates WHERE id = $1', [candidateId]);
  if (candidateResult.rows.length === 0) return null;

  const candidate = candidateResult.rows[0];
  const submissions = await pool.query('SELECT * FROM candidate_submissions WHERE candidate_id = $1', [candidateId]);
  const timeline = await pool.query('SELECT * FROM candidate_timeline WHERE candidate_id = $1', [candidateId]);

  const profileData = {
    candidate,
    submissions: submissions.rows,
    timeline: timeline.rows,
    joining_date: joiningDate,
  };

  const result = await pool.query(
    `INSERT INTO greyhr_archive (candidate_id, archived_by, joined_company, profile_data)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [candidateId, userId, companyName, JSON.stringify(profileData)]
  );

  await pool.query("UPDATE candidates SET status = 'archived' WHERE id = $1", [candidateId]);

  await pool.query(
    `INSERT INTO candidate_timeline (candidate_id, hr_user_id, action, note, related_company)
     VALUES ($1, $2, $3, $4, $5)`,
    [candidateId, userId, 'Archived to GreyHR', `Profile archived after joining ${companyName}`, companyName]
  );

  const enriched = await pool.query(
    `SELECT ga.*, c.name AS candidate_name,
      CONCAT(u.first_name, ' ', u.last_name) AS archived_by_name,
      (ga.profile_data->>'joining_date') AS joining_date
     FROM greyhr_archive ga
     LEFT JOIN candidates c ON c.id = ga.candidate_id
     LEFT JOIN hr_users u ON u.id = ga.archived_by
     WHERE ga.id = $1`,
    [result.rows[0].id]
  );

  return mapArchiveEntry(enriched.rows[0]);
};

module.exports = {
  listArchive,
  archiveCandidate,
};
