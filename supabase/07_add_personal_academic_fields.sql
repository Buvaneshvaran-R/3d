-- =====================================================
-- ADD PERSONAL AND ACADEMIC INFORMATION FIELDS
-- Run this in Supabase SQL Editor to add new fields
-- =====================================================

-- Add new personal information fields to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS father_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS permanent_address TEXT,
ADD COLUMN IF NOT EXISTS communication_address TEXT,
ADD COLUMN IF NOT EXISTS date_of_joining DATE,
ADD COLUMN IF NOT EXISTS branch VARCHAR(100),
ADD COLUMN IF NOT EXISTS credits_earned INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS backlogs INT DEFAULT 0;

-- Add comment to document the fields
COMMENT ON COLUMN students.father_name IS 'Father''s full name';
COMMENT ON COLUMN students.mother_name IS 'Mother''s full name';
COMMENT ON COLUMN students.guardian_name IS 'Guardian''s full name (if different from parents)';
COMMENT ON COLUMN students.guardian_phone IS 'Guardian contact number';
COMMENT ON COLUMN students.permanent_address IS 'Permanent residential address';
COMMENT ON COLUMN students.communication_address IS 'Current communication/mailing address';
COMMENT ON COLUMN students.date_of_joining IS 'Date when student joined the institution';
COMMENT ON COLUMN students.branch IS 'Branch/Specialization within department';
COMMENT ON COLUMN students.credits_earned IS 'Total credits earned so far';
COMMENT ON COLUMN students.backlogs IS 'Number of pending/failed subjects';

-- Update the updated_at trigger to fire on updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optionally, add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_students_date_of_joining ON students(date_of_joining);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch);
