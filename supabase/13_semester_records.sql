-- =====================================================
-- SEMESTER RECORDS TABLE
-- Stores historical semester-wise academic performance
-- =====================================================

-- Create semester_records table
CREATE TABLE IF NOT EXISTS semester_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    semester INT NOT NULL,
    academic_year VARCHAR(20),
    credits_earned INT DEFAULT 0,
    backlogs INT DEFAULT 0,
    cgpa DECIMAL(4, 2) DEFAULT 0.00,
    sgpa DECIMAL(4, 2) DEFAULT 0.00,
    result_published BOOLEAN DEFAULT false,
    result_published_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, semester)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_semester_records_student ON semester_records(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_records_semester ON semester_records(semester);
CREATE INDEX IF NOT EXISTS idx_semester_records_published ON semester_records(result_published);

-- RLS Policies
ALTER TABLE semester_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view own semester records" ON semester_records;
DROP POLICY IF EXISTS "Admins can view all semester records" ON semester_records;
DROP POLICY IF EXISTS "Admins can insert semester records" ON semester_records;
DROP POLICY IF EXISTS "Admins can update semester records" ON semester_records;
DROP POLICY IF EXISTS "Admins can delete semester records" ON semester_records;

-- Students can view their own semester records
CREATE POLICY "Students can view own semester records"
ON semester_records FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
  )
);

-- Admins can view all semester records
CREATE POLICY "Admins can view all semester records"
ON semester_records FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  )
);

-- Admins can insert semester records
CREATE POLICY "Admins can insert semester records"
ON semester_records FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  )
);

-- Admins can update semester records
CREATE POLICY "Admins can update semester records"
ON semester_records FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  )
);

-- Admins can delete semester records
CREATE POLICY "Admins can delete semester records"
ON semester_records FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  )
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_semester_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_semester_records_timestamp ON semester_records;

CREATE TRIGGER update_semester_records_timestamp
BEFORE UPDATE ON semester_records
FOR EACH ROW
EXECUTE FUNCTION update_semester_records_updated_at();

-- Sample comment
COMMENT ON TABLE semester_records IS 'Stores semester-wise academic records for students. Results are only visible when result_published is true.';
