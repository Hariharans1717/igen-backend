-- Add attachment columns to candidate_notes
ALTER TABLE candidate_notes 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
