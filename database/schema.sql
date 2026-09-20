-- iGEN Talent Acquisition & Candidate Pipeline Tracking System
-- PostgreSQL Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- ENUMS
-- =========================================

DO $$ BEGIN
    CREATE TYPE hr_role_enum AS ENUM ('admin', 'recruiter', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE employment_status_enum AS ENUM (
        'employed', 
        'unemployed', 
        'freelance',
        'freelancer',
        'student',
        'notice_period'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE candidate_status_enum AS ENUM (
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
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status_enum AS ENUM (
        'submitted', 
        'shortlisted',
        'interviewing',
        'interview_scheduled',
        'interview_completed',
        'offered', 
        'offer_accepted',
        'joined', 
        'rejected',
        'withdrawn',
        'on_hold'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE interview_mode_enum AS ENUM (
        'in_person', 
        'virtual', 
        'telephone'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE interview_result_enum AS ENUM (
        'pending', 
        'cleared', 
        'rejected', 
        'on_hold', 
        'no_show',
        'rescheduled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE offer_status_enum AS ENUM (
        'pending', 
        'accepted', 
        'declined', 
        'revoked'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =========================================
-- TABLES
-- =========================================

-- 1. Authentication Module
CREATE TABLE IF NOT EXISTS hr_users (
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

-- 2. Candidate Management Module
CREATE SEQUENCE IF NOT EXISTS candidate_id_seq START WITH 1;

CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL, -- Duplicate Detection
    mobile VARCHAR(20) UNIQUE NOT NULL, -- Duplicate Detection
    employment_status employment_status_enum NOT NULL,
    expected_ctc NUMERIC(10, 2) NOT NULL,
    preferred_location VARCHAR(100) NOT NULL,
    skills TEXT[] NOT NULL,
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(100) NOT NULL DEFAULT 'new',
    
    -- If employed
    current_company VARCHAR(100),
    current_designation VARCHAR(100),
    current_ctc NUMERIC(10, 2),
    experience_years NUMERIC(4, 1),
    
    created_by UUID REFERENCES hr_users(id),
    photo_url TEXT,
    resume_url TEXT,
    resume_filename VARCHAR(255),
    aadhaar_number VARCHAR(255),
    aadhaar_last4 VARCHAR(4),
    pan_number VARCHAR(10),
    candidate_code VARCHAR(50),
    dob DATE,
    expected_hike_percent NUMERIC(5,2),
    current_currency VARCHAR(3) DEFAULT 'INR',
    expected_currency VARCHAR(3) DEFAULT 'INR',
    passport_number VARCHAR(50),
    passport_expiry_date DATE,
    lwd DATE,
    priority BOOLEAN DEFAULT FALSE,
    notice_period VARCHAR(100),
    current_location VARCHAR(100),
    remarks TEXT,
    department VARCHAR(100),
    key_skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Company & Branch Management Module (Defined before candidate_offers & interviews)
CREATE TABLE IF NOT EXISTS companies (
    company_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(100) NOT NULL UNIQUE,
    company_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
    branch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    branch_name VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    is_headquarters BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, branch_name)
);

-- 4. Identity Documents (encrypted & masked)
CREATE TABLE IF NOT EXISTS candidate_documents (
    doc_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_identity_id BIGINT GENERATED ALWAYS AS IDENTITY,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    aadhaar_encrypted VARCHAR(255) NOT NULL,
    aadhaar_last4 VARCHAR(4),
    pan_number VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(candidate_id)
);

-- 5. Salary Information with Multiple Currencies
CREATE TABLE IF NOT EXISTS candidate_salary (
    salary_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salary_identity_id BIGINT GENERATED ALWAYS AS IDENTITY,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    current_ctc NUMERIC(12, 2),
    current_currency VARCHAR(3) DEFAULT 'INR',
    expected_ctc NUMERIC(12, 2) NOT NULL,
    expected_currency VARCHAR(3) DEFAULT 'INR',
    location VARCHAR(100),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Multiple Currency Offers Tracker
CREATE TABLE IF NOT EXISTS candidate_offers (
    offer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_identity_id BIGINT GENERATED ALWAYS AS IDENTITY,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'pending',
    offer_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Partner Company Submission Module
CREATE TABLE IF NOT EXISTS candidate_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    client_company VARCHAR(100) NOT NULL,
    submitted_by UUID REFERENCES hr_users(id),
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status submission_status_enum NOT NULL DEFAULT 'submitted',
    offer_ctc NUMERIC(10, 2),
    joining_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_candidate_submission UNIQUE (candidate_id, client_company)
);

-- 8. Interview Tracking Module
CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES candidate_submissions(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(branch_id) ON DELETE SET NULL,
    interview_date TIMESTAMP WITH TIME ZONE,
    interview_round VARCHAR(50),
    interview_mode interview_mode_enum,
    interview_feedback TEXT,
    result interview_result_enum NOT NULL DEFAULT 'pending',
    offered_ctc NUMERIC(10, 2),
    offer_status offer_status_enum,
    joining_date DATE,
    recruiter_notes TEXT,
    interviewer_name VARCHAR(255),
    interview_time TIME,
    interview_type VARCHAR(100),
    title VARCHAR(255),
    sub_status VARCHAR(100) DEFAULT 'awaiting_invite',
    candidate_id_uuid UUID,
    candidate_id_int INT,
    candidate_name VARCHAR(255),
    role VARCHAR(100),
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Per-Company Pipeline Module
CREATE TABLE IF NOT EXISTS candidate_company_pipeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    company_name VARCHAR(100) NOT NULL,
    branch_id UUID REFERENCES branches(branch_id) ON DELETE SET NULL,
    interview_status VARCHAR(60) NOT NULL DEFAULT 'awaiting_schedule',
    sub_status VARCHAR(60),
    status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(candidate_id, company_name)
);

-- 10. Status History Module
CREATE TABLE IF NOT EXISTS candidate_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    company_name VARCHAR(100),
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Timeline / Activity Feed
CREATE TABLE IF NOT EXISTS candidate_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    hr_user_id UUID REFERENCES hr_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    note TEXT,
    related_company VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Recruiter Notes with Version History
CREATE TABLE IF NOT EXISTS candidate_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    hr_user_id UUID REFERENCES hr_users(id) ON DELETE SET NULL,
    title VARCHAR(255) DEFAULT 'Note',
    note_text TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'personal_note',
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    tags TEXT[],
    updated_by VARCHAR(100),
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT check_status CHECK (status IN ('open', 'in-progress', 'completed', 'archived'))
);

-- Note Edit History (Audit Trail)
CREATE TABLE IF NOT EXISTS note_edit_history (
    edit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edit_identity_id BIGINT GENERATED ALWAYS AS IDENTITY,
    note_id UUID NOT NULL REFERENCES candidate_notes(id) ON DELETE CASCADE,
    version INT NOT NULL,
    previous_content TEXT NOT NULL,
    edited_by VARCHAR(100) NOT NULL DEFAULT 'You',
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    change_reason TEXT
);

-- 13. Follow-up Notification System
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hr_user_id UUID REFERENCES hr_users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    related_candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Audit Trail / Candidate History
CREATE TABLE IF NOT EXISTS candidate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES hr_users(id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. GreyHR Archive Module
CREATE TABLE IF NOT EXISTS greyhr_archive (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    archived_by UUID REFERENCES hr_users(id) ON DELETE SET NULL,
    joined_company VARCHAR(100) NOT NULL,
    archive_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    profile_data JSONB NOT NULL
);

-- 16. Refresh Tokens
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

-- =========================================
-- INDEXES FOR SEARCH & PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates (name);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates (email);
CREATE INDEX IF NOT EXISTS idx_candidates_mobile ON candidates (mobile);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates (status);
CREATE INDEX IF NOT EXISTS idx_candidates_candidate_code ON candidates (candidate_code);
CREATE INDEX IF NOT EXISTS idx_candidates_created_by ON candidates (created_by);
CREATE INDEX IF NOT EXISTS idx_candidates_skills ON candidates USING GIN (skills);

CREATE INDEX IF NOT EXISTS idx_companies_company_code ON companies (company_code);
CREATE INDEX IF NOT EXISTS idx_submissions_client_company ON candidate_submissions (client_company);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON candidate_submissions (status);

CREATE INDEX IF NOT EXISTS idx_interviews_result ON interviews (result);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews (interview_date);
CREATE INDEX IF NOT EXISTS idx_timeline_candidate_id ON candidate_timeline (candidate_id);
CREATE INDEX IF NOT EXISTS idx_notifications_hr_user_id_unread ON notifications (hr_user_id) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_salary_candidate ON candidate_salary (candidate_id);
CREATE INDEX IF NOT EXISTS idx_offers_candidate ON candidate_offers (candidate_id);
CREATE INDEX IF NOT EXISTS idx_notes_candidate ON candidate_notes (candidate_id);
CREATE INDEX IF NOT EXISTS idx_notes_category ON candidate_notes (category);
CREATE INDEX IF NOT EXISTS idx_notes_priority ON candidate_notes (priority);
CREATE INDEX IF NOT EXISTS idx_edit_history_note ON note_edit_history (note_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON auth_refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_candidate ON candidate_company_pipeline (candidate_id);
CREATE INDEX IF NOT EXISTS idx_status_history_candidate ON candidate_status_history (candidate_id);

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

DROP TRIGGER IF EXISTS update_hr_users_modtime ON hr_users;
CREATE TRIGGER update_hr_users_modtime
    BEFORE UPDATE ON hr_users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_candidates_modtime ON candidates;
CREATE TRIGGER update_candidates_modtime
    BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_submissions_modtime ON candidate_submissions;
CREATE TRIGGER update_submissions_modtime
    BEFORE UPDATE ON candidate_submissions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_interviews_modtime ON interviews;
CREATE TRIGGER update_interviews_modtime
    BEFORE UPDATE ON interviews
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_candidate_notes_modtime ON candidate_notes;
CREATE TRIGGER update_candidate_notes_modtime
    BEFORE UPDATE ON candidate_notes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_pipeline_modtime ON candidate_company_pipeline;
CREATE TRIGGER update_pipeline_modtime
    BEFORE UPDATE ON candidate_company_pipeline
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
