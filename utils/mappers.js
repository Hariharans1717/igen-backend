const {
  CANDIDATE_STATUSES,
  SUBMISSION_STATUSES,
  EMPLOYMENT_STATUSES,
  INTERVIEW_RESULTS,
  NOTIFICATION_TYPES,
} = require('./enums');

const mapEmploymentStatusFromDb = (value) => (value === 'freelance' ? 'freelancer' : value);
const mapEmploymentStatusToDb = (value) => value;

const mapCandidateStatusFromDb = (value) => (CANDIDATE_STATUSES.includes(value) ? value : 'active');
const mapCandidateStatusToDb = (value) => (CANDIDATE_STATUSES.includes(value) ? value : 'active');

const mapSubmissionStatusFromDb = (value) => (value === 'interviewing' ? 'interview_scheduled' : value);
const mapSubmissionStatusToDb = (value) => (SUBMISSION_STATUSES.includes(value) ? value : 'submitted');

const mapInterviewResultFromDb = (value) => {
  if (value === 'on_hold') return 'pending';
  return INTERVIEW_RESULTS.includes(value) ? value : 'pending';
};
const mapInterviewResultToDb = (value) => (INTERVIEW_RESULTS.includes(value) ? value : 'pending');

const mapNotificationTypeFromDb = (value) => {
  if (value === 'interview_tomorrow') return 'interview_reminder';
  if (value === 'follow_up_pending') return 'follow_up';
  if (value === 'offer_response_pending') return 'offer_pending';
  if (value === 'inactive') return 'inactive_candidate';
  return NOTIFICATION_TYPES.includes(value) ? value : 'follow_up';
};

const candidateStatusFromSubmissionStatus = (status) => {
  switch (status) {
    case 'submitted':
    case 'shortlisted':
      return 'submitted';
    case 'interviewing':
    case 'interview_scheduled':
    case 'interview_completed':
      return 'interview_scheduled';
    case 'offered':
    case 'offer_accepted':
      return 'offered';
    case 'joined':
      return 'joined';
    case 'rejected':
      return 'rejected';
    case 'on_hold':
      return 'on_hold';
    case 'withdrawn':
      return 'active';
    default:
      return 'active';
  }
};

const normalizeEmploymentStatus = (value) => {
  if (!value) return 'unemployed';
  const normalized = mapEmploymentStatusToDb(value);
  return EMPLOYMENT_STATUSES.includes(normalized) ? normalized : 'unemployed';
};

module.exports = {
  mapEmploymentStatusFromDb,
  mapEmploymentStatusToDb,
  mapCandidateStatusFromDb,
  mapCandidateStatusToDb,
  mapSubmissionStatusFromDb,
  mapSubmissionStatusToDb,
  mapInterviewResultFromDb,
  mapInterviewResultToDb,
  mapNotificationTypeFromDb,
  candidateStatusFromSubmissionStatus,
  normalizeEmploymentStatus,
};
