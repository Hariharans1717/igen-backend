-- The interview service selects iv.company_name for legacy/interview records
-- that are not linked to a company or submission.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(100);
