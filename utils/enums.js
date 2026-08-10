const USER_ROLES = ['admin', 'recruiter', 'viewer'];

const EMPLOYMENT_STATUSES = [
  'employed',
  'unemployed',
  'freelance',
  'freelancer',
  'student',
  'notice_period',
];

const CANDIDATE_STATUSES = [
  'new',
  'active',
  'submitted',
  'interview_scheduled',
  'offered',
  'inactive',
  'on_hold',
  'joined',
  'rejected',
  'not_reachable',
  'follow_up',
  'archived',
  // 16 Stage Pipeline
  'awaiting_interview',
  'awaiting_schedule',
  'l1_awaiting_schedule',
  'l1_scheduled',
  'awaiting_result',
  'l1_awaiting_result',
  'l1_reject',
  'l2_awaiting_schedule',
  'l2_scheduled',
  'l2_awaiting_result',
  'l2_reject',
  'l3_awaiting_schedule',
  'l3_scheduled',
  'l3_awaiting_result',
  'l3_reject',
  'final_select',
  'candidate_declined',
  'awaiting_verification',
  'verification_reject',
  'deployed',
];

const INTERVIEW_RESULTS = [
  'pending',
  'cleared',
  'rejected',
  'on_hold',
  'no_show',
  'rescheduled',
];

const INTERVIEW_MODES = [
  'in_person',
  'virtual',
  'telephone',
  'online',
  'offline',
  'telephonic',
];

const NOTIFICATION_TYPES = [
  'follow_up',
  'interview_reminder',
  'offer_pending',
  'inactive_candidate',
  'interview_tomorrow',
  'follow_up_pending',
  'offer_response_pending',
  'inactive',
];

module.exports = {
  USER_ROLES,
  EMPLOYMENT_STATUSES,
  CANDIDATE_STATUSES,
  INTERVIEW_RESULTS,
  INTERVIEW_MODES,
  NOTIFICATION_TYPES,
};
