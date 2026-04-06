-- =====================================================
-- MOODLE NOTES BACKEND SETUP
-- Create table, indexes, storage bucket, and RLS policies
-- =====================================================

-- Create Moodle notes table
CREATE TABLE IF NOT EXISTS moodle_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(100) NOT NULL,
    year INT NOT NULL CHECK (year BETWEEN 1 AND 4),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    pdf_name VARCHAR(255) NOT NULL,
    pdf_path TEXT NOT NULL,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_moodle_notes_subject ON moodle_notes(subject);
CREATE INDEX IF NOT EXISTS idx_moodle_notes_year ON moodle_notes(year);
CREATE INDEX IF NOT EXISTS idx_moodle_notes_created_at ON moodle_notes(created_at DESC);

-- Create storage bucket for Moodle PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('moodle-notes', 'moodle-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE moodle_notes ENABLE ROW LEVEL SECURITY;

-- Reuse the existing admin helper if present, otherwise define it here.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Anyone authenticated can read Moodle notes
DROP POLICY IF EXISTS "Authenticated users can view Moodle notes" ON moodle_notes;
CREATE POLICY "Authenticated users can view Moodle notes"
ON moodle_notes FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert Moodle notes
DROP POLICY IF EXISTS "Admins can insert Moodle notes" ON moodle_notes;
CREATE POLICY "Admins can insert Moodle notes"
ON moodle_notes FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update Moodle notes
DROP POLICY IF EXISTS "Admins can update Moodle notes" ON moodle_notes;
CREATE POLICY "Admins can update Moodle notes"
ON moodle_notes FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only admins can delete Moodle notes
DROP POLICY IF EXISTS "Admins can delete Moodle notes" ON moodle_notes;
CREATE POLICY "Admins can delete Moodle notes"
ON moodle_notes FOR DELETE
TO authenticated
USING (is_admin());

-- Allow authenticated users to read files in the Moodle bucket
DROP POLICY IF EXISTS "Authenticated users can view Moodle PDFs" ON storage.objects;
CREATE POLICY "Authenticated users can view Moodle PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'moodle-notes');

-- Allow admins to upload Moodle PDFs
DROP POLICY IF EXISTS "Admins can upload Moodle PDFs" ON storage.objects;
CREATE POLICY "Admins can upload Moodle PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moodle-notes'
  AND is_admin()
);

-- Allow admins to update Moodle PDFs
DROP POLICY IF EXISTS "Admins can update Moodle PDFs" ON storage.objects;
CREATE POLICY "Admins can update Moodle PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'moodle-notes'
  AND is_admin()
)
WITH CHECK (
  bucket_id = 'moodle-notes'
  AND is_admin()
);

-- Allow admins to delete Moodle PDFs
DROP POLICY IF EXISTS "Admins can delete Moodle PDFs" ON storage.objects;
CREATE POLICY "Admins can delete Moodle PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moodle-notes'
  AND is_admin()
);

-- Optional updated_at trigger
CREATE OR REPLACE FUNCTION update_moodle_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS moodle_notes_updated_at ON moodle_notes;
CREATE TRIGGER moodle_notes_updated_at
    BEFORE UPDATE ON moodle_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_moodle_notes_updated_at();
