-- =====================================================
-- ADD PARENT PHONE NUMBERS
-- Run this to add phone fields for father and mother
-- =====================================================

-- Add parent phone number fields
ALTER TABLE students
ADD COLUMN IF NOT EXISTS father_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS mother_phone VARCHAR(20);

-- Add comments to document the fields
COMMENT ON COLUMN students.father_phone IS 'Father''s contact number';
COMMENT ON COLUMN students.mother_phone IS 'Mother''s contact number';
