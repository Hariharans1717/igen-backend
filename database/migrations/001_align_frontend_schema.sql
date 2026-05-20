-- Align DB enums/columns with frontend types.
-- If your migration tool wraps statements in a transaction and fails on ALTER TYPE,
-- run the ALTER TYPE statements manually one-by-one.

-- Roles
ALTER TYPE hr_role_enum ADD VALUE IF NOT EXISTS 'viewer';

-- Employment status
ALTER TYPE employment_status_enum ADD VALUE IF NOT EXISTS 'freelancer';
ALTER TYPE employment_status_enum ADD VALUE IF NOT EXISTS 'notice_period';

-- Candidate status
ALTER TYPE candidate_status_enum ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE candidate_status_enum ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE candidate_status_enum ADD VALUE IF NOT EXISTS 'interview_scheduled';
ALTER TYPE candidate_status_enum ADD VALUE IF NOT EXISTS 'offered';
ALTER TYPE candidate_status_enum ADD VALUE IF NOT EXISTS 'follow_up';
ALTER TYPE candidate_status_enum ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE candidates
  ALTER COLUMN status SET DEFAULT 'new';

-- Submission status
ALTER TYPE submission_status_enum ADD VALUE IF NOT EXISTS 'shortlisted';
ALTER TYPE submission_status_enum ADD VALUE IF NOT EXISTS 'interview_scheduled';
ALTER TYPE submission_status_enum ADD VALUE IF NOT EXISTS 'interview_completed';
ALTER TYPE submission_status_enum ADD VALUE IF NOT EXISTS 'offer_accepted';
ALTER TYPE submission_status_enum ADD VALUE IF NOT EXISTS 'withdrawn';

-- Interview result
ALTER TYPE interview_result_enum ADD VALUE IF NOT EXISTS 'rescheduled';

-- Submissions: add missing columns
ALTER TABLE candidate_submissions
  ADD COLUMN IF NOT EXISTS offer_ctc NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS joining_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Notes: track updates
ALTER TABLE candidate_notes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

UPDATE candidate_notes SET updated_at = created_at WHERE updated_at IS NULL;

-- Refresh tokens
CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES hr_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  user_agent TEXT,
  ip_address VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON auth_refresh_tokens (user_id);
