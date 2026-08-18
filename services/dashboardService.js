const pool = require('../config/db');

const getKPIs = async () => {
  const result = await pool.query(`
    SELECT
      COUNT(DISTINCT c.id) FILTER (WHERE c.status != 'inactive') AS total_candidates,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('new','active','submitted','interview_scheduled','offered','on_hold','follow_up')) AS active_pipeline,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'on_hold') AS on_hold,
      
      -- Granular Interview Statuses (L1/L2/L3)
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'awaiting_interview') AS awaiting_interview,
      
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'awaiting_schedule') AS awaiting_schedule_l1,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'l2_awaiting_schedule') AS awaiting_schedule_l2,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'l3_awaiting_schedule') AS awaiting_schedule_l3,

      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'awaiting_result' OR c.status = 'l1_awaiting_result') AS awaiting_result_l1,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'l2_awaiting_result') AS awaiting_result_l2,

      COUNT(DISTINCT iv.id) FILTER (WHERE iv.interview_round ILIKE '%L1%') AS total_interviews_l1,
      COUNT(DISTINCT iv.id) FILTER (WHERE iv.interview_round ILIKE '%L2%') AS total_interviews_l2,
      COUNT(DISTINCT iv.id) FILTER (WHERE iv.interview_round ILIKE '%L3%') AS total_interviews_l3,

      COUNT(DISTINCT iv.id) FILTER (WHERE iv.interview_round ILIKE '%L1%' AND iv.result::text IN ('cleared', 'selected', 'selected_for_next_round')) AS passed_interviews_l1,
      COUNT(DISTINCT iv.id) FILTER (WHERE iv.interview_round ILIKE '%L2%' AND iv.result::text IN ('cleared', 'selected', 'selected_for_next_round')) AS passed_interviews_l2,
      COUNT(DISTINCT iv.id) FILTER (WHERE iv.interview_round ILIKE '%L3%' AND iv.result::text IN ('cleared', 'selected', 'selected_for_next_round')) AS passed_interviews_l3
    FROM candidates c
    LEFT JOIN interviews iv ON iv.candidate_id_uuid = c.id
  `);

  const row = result.rows[0];

  return {
    totalCandidates: parseInt(row.total_candidates, 10) || 0,
    activePipeline: parseInt(row.active_pipeline, 10) || 0,
    onHold: parseInt(row.on_hold, 10) || 0,
    awaitingInterview: parseInt(row.awaiting_interview, 10) || 0,
    
    awaitingSchedule: {
      l1: parseInt(row.awaiting_schedule_l1, 10) || 0,
      l2: parseInt(row.awaiting_schedule_l2, 10) || 0,
      l3: parseInt(row.awaiting_schedule_l3, 10) || 0,
    },
    awaitingResult: {
      l1: parseInt(row.awaiting_result_l1, 10) || 0,
      l2: parseInt(row.awaiting_result_l2, 10) || 0,
      l3: 0,
    },
    totalInterviews: {
      l1: parseInt(row.total_interviews_l1, 10) || 0,
      l2: parseInt(row.total_interviews_l2, 10) || 0,
      l3: parseInt(row.total_interviews_l3, 10) || 0,
    },
    passedInterviews: {
      l1: parseInt(row.passed_interviews_l1, 10) || 0,
      l2: parseInt(row.passed_interviews_l2, 10) || 0,
      l3: parseInt(row.passed_interviews_l3, 10) || 0,
    },
  };
};

const getTodaysInterviews = async (timezone = 'Asia/Kolkata') => {
  const result = await pool.query(`
    SELECT
      iv.id,
      COALESCE(c.name, iv.candidate_name) AS candidate_name,
      COALESCE(comp.company_name, cs.client_company) AS company_name,
      iv.interview_time,
      iv.interview_date
    FROM interviews iv
    LEFT JOIN companies comp ON comp.company_id = iv.company_id
    LEFT JOIN candidate_submissions cs ON cs.id = iv.submission_id
    LEFT JOIN candidates c ON c.id = iv.candidate_id_uuid OR c.id = cs.candidate_id
    WHERE DATE(iv.interview_date AT TIME ZONE $1) = DATE(CURRENT_TIMESTAMP AT TIME ZONE $1)
    ORDER BY iv.interview_time ASC NULLS LAST
  `, [timezone]);

  return result.rows.map((row) => ({
    id: row.id,
    candidateName: row.candidate_name,
    companyName: row.company_name,
    interviewTime: row.interview_time,
    interviewDate: row.interview_date
  }));
};

const getRecruiterPerformance = async () => {
  const result = await pool.query(`
    SELECT
      CONCAT(u.first_name, ' ', u.last_name) AS name,
      (SELECT COUNT(*) FROM candidate_submissions cs WHERE cs.submitted_by = u.id) AS submissions,
      (SELECT COUNT(*) FROM interviews iv
       JOIN candidate_submissions cs ON cs.id = iv.submission_id
       WHERE cs.submitted_by = u.id) AS interviews,
      (SELECT COUNT(*) FROM candidate_submissions cs
       WHERE cs.submitted_by = u.id AND cs.status IN ('offered', 'offer_accepted', 'joined')) AS offers,
      (SELECT COUNT(*) FROM candidate_submissions cs
       WHERE cs.submitted_by = u.id AND cs.status = 'joined') AS joins
    FROM hr_users u
    WHERE u.is_active = true
    ORDER BY u.first_name
  `);

  return result.rows.map((row) => ({
    name: row.name,
    submissions: parseInt(row.submissions, 10),
    interviews: parseInt(row.interviews, 10),
    offers: parseInt(row.offers, 10),
    joins: parseInt(row.joins, 10),
  }));
};

const getCompanyHiring = async () => {
  const result = await pool.query(`
    SELECT
      COALESCE(comp.company_name, cs.client_company) AS company,
      COUNT(DISTINCT iv.id) AS interviews,
      COUNT(DISTINCT CASE WHEN iv.result::text IN ('cleared', 'selected', 'selected_for_next_round') THEN iv.id END) AS offers,
      COUNT(DISTINCT CASE
        WHEN c.status IN ('deployed', 'joined', 'final_select', 'awaiting_verification') THEN c.id
      END) AS joins,
      COUNT(DISTINCT COALESCE(c.id::text, cs.candidate_id::text)) AS submissions
    FROM interviews iv
    LEFT JOIN companies comp ON comp.company_id = iv.company_id
    LEFT JOIN candidate_submissions cs ON cs.id = iv.submission_id
    LEFT JOIN candidates c
      ON c.id = iv.candidate_id_uuid
      OR c.id = cs.candidate_id
    WHERE COALESCE(comp.company_name, cs.client_company) IS NOT NULL
      AND COALESCE(comp.company_name, cs.client_company) != ''
    GROUP BY COALESCE(comp.company_name, cs.client_company)
    ORDER BY interviews DESC
    LIMIT 10
  `);

  return result.rows.map((row) => ({
    company: row.company,
    submissions: parseInt(row.submissions, 10) || 0,
    interviews: parseInt(row.interviews, 10) || 0,
    offers: parseInt(row.offers, 10) || 0,
    joins: parseInt(row.joins, 10) || 0,
  }));
};

const getMonthlyTrends = async () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const submissionsResult = await pool.query(`
    SELECT EXTRACT(MONTH FROM submission_date) AS month, COUNT(*) AS count
    FROM candidate_submissions
    GROUP BY EXTRACT(MONTH FROM submission_date)
  `);

  const interviewsResult = await pool.query(`
    SELECT EXTRACT(MONTH FROM interview_date) AS month, COUNT(*) AS count
    FROM interviews
    GROUP BY EXTRACT(MONTH FROM interview_date)
  `);

  const offersResult = await pool.query(`
    SELECT EXTRACT(MONTH FROM created_at) AS month, COUNT(*) AS count
    FROM candidate_submissions
    WHERE status IN ('offered', 'offer_accepted', 'joined')
    GROUP BY EXTRACT(MONTH FROM created_at)
  `);

  const joinsResult = await pool.query(`
    SELECT EXTRACT(MONTH FROM created_at) AS month, COUNT(*) AS count
    FROM candidate_submissions
    WHERE status = 'joined'
    GROUP BY EXTRACT(MONTH FROM created_at)
  `);

  const toMap = (rows) => {
    const map = {};
    rows.forEach((r) => { map[parseInt(r.month, 10)] = parseInt(r.count, 10); });
    return map;
  };

  const subMap = toMap(submissionsResult.rows);
  const ivMap = toMap(interviewsResult.rows);
  const offerMap = toMap(offersResult.rows);
  const joinMap = toMap(joinsResult.rows);

  return months.map((month, i) => ({
    month,
    submissions: subMap[i + 1] || 0,
    interviews: ivMap[i + 1] || 0,
    offers: offerMap[i + 1] || 0,
    joins: joinMap[i + 1] || 0,
  }));
};

module.exports = {
  getKPIs,
  getRecruiterPerformance,
  getCompanyHiring,
  getMonthlyTrends,
  getTodaysInterviews,
};
