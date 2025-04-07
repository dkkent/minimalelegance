-- Add skip-related fields to active_questions table
ALTER TABLE active_questions 
ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS skip_note TEXT,
ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMP;