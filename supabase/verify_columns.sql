-- =====================================================
-- VERIFY ALL COLUMNS EXIST IN STUDENTS TABLE
-- Run this to check if all required columns are present
-- =====================================================

-- Check all columns in students table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'students'
ORDER BY ordinal_position;

-- Expected columns for Personal Info page:
-- name, register_no, department, branch, current_year, semester
-- email, phone, date_of_birth, date_of_joining, blood_group
-- permanent_address, communication_address
-- father_name, father_phone, mother_name, mother_phone
-- guardian_name, guardian_phone
-- batch, credits_earned, backlogs
-- photo_url
