-- =====================================================
-- ADD PHOTO URL FIELD
-- Run this to add photo_url field for student photos
-- =====================================================

-- Add photo_url field to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment to document the field
COMMENT ON COLUMN students.photo_url IS 'URL to student profile photo stored in Supabase Storage';
