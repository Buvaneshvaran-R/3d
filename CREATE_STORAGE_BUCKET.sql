-- =====================================================
-- CREATE STORAGE BUCKET FOR STUDENT PHOTOS
-- Run this in Supabase SQL Editor to fix "Bucket not found" error
-- =====================================================

-- Create storage bucket for student photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete photos" ON storage.objects;

-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-photos');

-- Allow public read access to photos
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'student-photos');

-- Allow users to update photos
CREATE POLICY "Users can update photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'student-photos');

-- Allow users to delete photos
CREATE POLICY "Users can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'student-photos');

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'student-photos';
