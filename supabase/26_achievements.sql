-- =====================================================
-- ACHIEVEMENTS SYSTEM SCHEMA
-- =====================================================

-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('achievement-certificates', 'achievement-certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow authenticated users to view certificates
CREATE POLICY "Public can view certificates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'achievement-certificates');

-- Allow admins to upload certificates
CREATE POLICY "Admins can upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'achievement-certificates');

-- Create Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    description TEXT,
    date_of_participation DATE NOT NULL,
    achievement_type VARCHAR(100) NOT NULL,
    certificate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_achievements_student_id ON achievements(student_id);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Policies for Achievements Table
-- Admins can do everything
CREATE POLICY "Admins can manage all achievements"
ON achievements
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
);

-- Students can only view their own achievements
CREATE POLICY "Students can view their own achievements"
ON achievements
FOR SELECT
TO authenticated
USING (
    student_id IN (
        SELECT id FROM students WHERE user_id = auth.uid()
    )
);

-- Create a view for easy access to student achievement details
CREATE OR REPLACE VIEW achievement_details AS
SELECT 
    a.id,
    a.student_id,
    s.name AS student_name,
    s.register_no,
    a.event_name,
    a.description,
    a.date_of_participation,
    a.achievement_type,
    a.certificate_url,
    a.created_at
FROM 
    achievements a
JOIN 
    students s ON a.student_id = s.id;
