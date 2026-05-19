-- iGEN Talent Acquisition & Candidate Pipeline Tracking System
-- PostgreSQL Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- ENUMS
-- =========================================

CREATE TYPE hr_role_enum AS ENUM (
    'admin', 
    'recruiter'
);

CREATE TYPE employment_status_enum AS ENUM (
    'employed', 
    'unemployed', 
    'freelance', 
    'student'
);

CREATE TYPE candidate_status_enum AS ENUM (
    'active', 
    'inactive', 
    'on_hold', 
    'joined', 
    'rejected',
    'not_reachable'
);

CREATE TYPE submission_status_enum AS ENUM (
    'submitted', 
    'interviewing', 
    'offered', 
    'joined', 
    'rejected',
    'on_hold'
);

CREATE TYPE interview_mode_enum AS ENUM (
    'in_person', 
    'virtual', 
    'telephone'
);

CREATE TYPE interview_result_enum AS ENUM (
    'pending', 
    'cleared', 
    'rejected', 
    'on_hold', 
    'no_show'
);

CREATE TYPE offer_status_enum AS ENUM (
    'pending', 
    'accepted', 
    'declined', 
    'revoked'
);

-- =========================================
-- TABLES
-- =========================================

-- 1. Authentication Module
CREATE TABLE hr_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role hr_role_enum NOT NULL DEFAULT 'recruiter',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Candidate Management Module
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL, -- Duplicate Detection
    mobile VARCHAR(20) UNIQUE NOT NULL, -- Duplicate Detection
    employment_status employment_status_enum NOT NULL,
    expected_ctc NUMERIC(10, 2) NOT NULL,
    preferred_location VARCHAR(100) NOT NULL,
    skills TEXT[] NOT NULL,
    status candidate_status_enum NOT NULL DEFAULT 'active',
    
    -- If employed
    current_company VARCHAR(100),
    current_designation VARCHAR(100),
    current_ctc NUMERIC(10, 2),
    experience_years NUMERIC(4, 1),
    
    created_by UUID REFERENCES hr_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Partner Company Submission Module
CREATE TABLE candidate_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    client_company VARCHAR(100) NOT NULL,
    submitted_by UUID REFERENCES hr_users(id),
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status submission_status_enum NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Duplicate Detection: Prevent submitting the same candidate to the same company twice
    CONSTRAINT unique_candidate_submission UNIQUE (candidate_id, client_company)
);

-- 6. Interview Tracking Module
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES candidate_submissions(id) ON DELETE CASCADE,
    interview_date TIMESTAMP WITH TIME ZONE NOT NULL,
    interview_round VARCHAR(50) NOT NULL,
    interview_mode interview_mode_enum NOT NULL,
    interview_feedback TEXT,
    result interview_result_enum NOT NULL DEFAULT 'pending',
    offered_ctc NUMERIC(10, 2),
    offer_status offer_status_enum,
    joining_date DATE,
    recruiter_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Timeline / Activity Feed
CREATE TABLE candidate_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    hr_user_id UUID REFERENCES hr_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    note TEXT,
    related_company VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Additional Recruiter Notes
CREATE TABLE candidate_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    hr_user_id UUID REFERENCES hr_users(id) ON DELETE SET NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Follow-up Notification System
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hr_user_id UUID REFERENCES hr_users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'interview_tomorrow', 'follow_up_pending', 'offer_response_pending', 'inactive'
    message TEXT NOT NULL,
    related_candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Trail / Candidate History
CREATE TABLE candidate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES hr_users(id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL, -- 'update', 'status_change'
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. GreyHR Archive Module
CREATE TABLE greyhr_archive (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    archived_by UUID REFERENCES hr_users(id) ON DELETE SET NULL,
    joined_company VARCHAR(100) NOT NULL,
    archive_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    profile_data JSONB NOT NULL -- Snapshot of candidate data, submissions, and timeline
);

-- =========================================
-- INDEXES FOR SEARCH & FILTER (Module 10)
-- =========================================

-- Global Search & Filtering Indexes
CREATE INDEX idx_candidates_name ON candidates (name);
CREATE INDEX idx_candidates_email ON candidates (email);
CREATE INDEX idx_candidates_mobile ON candidates (mobile);
CREATE INDEX idx_candidates_status ON candidates (status);
CREATE INDEX idx_candidates_created_by ON candidates (created_by);
CREATE INDEX idx_candidates_skills ON candidates USING GIN (skills);

CREATE INDEX idx_submissions_client_company ON candidate_submissions (client_company);
CREATE INDEX idx_submissions_status ON candidate_submissions (status);

CREATE INDEX idx_interviews_result ON interviews (result);
CREATE INDEX idx_interviews_date ON interviews (interview_date);

CREATE INDEX idx_timeline_candidate_id ON candidate_timeline (candidate_id);
CREATE INDEX idx_notifications_hr_user_id_unread ON notifications (hr_user_id) WHERE is_read = FALSE;

-- =========================================
-- TRIGGERS FOR UPDATED_AT
-- =========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hr_users_modtime
    BEFORE UPDATE ON hr_users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_candidates_modtime
    BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_submissions_modtime
    BEFORE UPDATE ON candidate_submissions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_interviews_modtime
    BEFORE UPDATE ON interviews
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
