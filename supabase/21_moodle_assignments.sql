-- =====================================================
-- MOODLE ASSIGNMENTS EXTENSION
-- Adds assignment upload + submission + grading workflow
-- =====================================================

-- Reuse helper functions if already defined in other scripts.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_student_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM students WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_student_current_year()
RETURNS INT AS $$
DECLARE
  student_semester INT;
  student_year INT;
BEGIN
  SELECT semester, current_year
  INTO student_semester, student_year
  FROM students
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF student_semester BETWEEN 1 AND 8 THEN
    RETURN CEIL(student_semester::numeric / 2)::int;
  END IF;

  RETURN student_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_student_section()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT section FROM students WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_student_department()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT department FROM students WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION normalize_department(value TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN regexp_replace(upper(coalesce(value, '')), '[^A-Z0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- ASSIGNMENTS TABLE ENHANCEMENTS
-- =====================================================
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS target_year INT CHECK (target_year BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS target_section VARCHAR(10),
  ADD COLUMN IF NOT EXISTS target_department VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_target_year ON assignments(target_year);
CREATE INDEX IF NOT EXISTS idx_assignments_target_section ON assignments(target_section);
CREATE INDEX IF NOT EXISTS idx_assignments_target_department ON assignments(target_department);

-- =====================================================
-- ASSIGNMENT SUBMISSIONS ENHANCEMENTS
-- =====================================================
ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS submission_text TEXT,
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Set submitted_at automatically for newly inserted rows when omitted.
ALTER TABLE assignment_submissions
  ALTER COLUMN submitted_at SET DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- STORAGE BUCKET FOR ASSIGNMENT FILES
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('moodle-assignments', 'moodle-assignments', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS: ASSIGNMENTS
-- =====================================================
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view assignments" ON assignments;
CREATE POLICY "Authenticated users can view assignments"
ON assignments FOR SELECT
TO authenticated
USING (
  is_admin()
  OR (
    (target_year IS NULL OR target_year = get_student_current_year())
    AND (
      target_section IS NULL
      OR upper(target_section) = 'ALL'
      OR upper(target_section) = upper(coalesce(get_student_section(), ''))
    )
    AND (
      target_department IS NULL
      OR normalize_department(target_department) = 'ALL'
      OR normalize_department(target_department) = normalize_department(get_student_department())
    )
  )
);

DROP POLICY IF EXISTS "Admins can create assignments" ON assignments;
CREATE POLICY "Admins can create assignments"
ON assignments FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update assignments" ON assignments;
CREATE POLICY "Admins can update assignments"
ON assignments FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete assignments" ON assignments;
CREATE POLICY "Admins can delete assignments"
ON assignments FOR DELETE
TO authenticated
USING (is_admin());

-- =====================================================
-- RLS: ASSIGNMENT SUBMISSIONS
-- =====================================================
DROP POLICY IF EXISTS "Students can view own assignment submissions" ON assignment_submissions;
CREATE POLICY "Students can view own assignment submissions"
ON assignment_submissions FOR SELECT
TO authenticated
USING (student_id = get_student_id());

DROP POLICY IF EXISTS "Students can create own assignment submissions" ON assignment_submissions;
CREATE POLICY "Students can create own assignment submissions"
ON assignment_submissions FOR INSERT
TO authenticated
WITH CHECK (student_id = get_student_id());

DROP POLICY IF EXISTS "Students can update own assignment submissions" ON assignment_submissions;
CREATE POLICY "Students can update own assignment submissions"
ON assignment_submissions FOR UPDATE
TO authenticated
USING (student_id = get_student_id())
WITH CHECK (student_id = get_student_id());

DROP POLICY IF EXISTS "Admins can view all assignment submissions" ON assignment_submissions;
CREATE POLICY "Admins can view all assignment submissions"
ON assignment_submissions FOR SELECT
TO authenticated
USING (is_admin());

DROP POLICY IF EXISTS "Admins can grade assignment submissions" ON assignment_submissions;
CREATE POLICY "Admins can grade assignment submissions"
ON assignment_submissions FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- =====================================================
-- STORAGE POLICIES: moodle-assignments bucket
-- - teacher files path: teacher/{admin-user-id}/...
-- - student files path: {student-user-id}/{assignment-id}/...
-- =====================================================
DROP POLICY IF EXISTS "Users can read allowed assignment files" ON storage.objects;
CREATE POLICY "Users can read allowed assignment files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'moodle-assignments'
  AND (
    is_admin()
    OR split_part(name, '/', 1) = auth.uid()::text
    OR split_part(name, '/', 1) = 'teacher'
  )
);

DROP POLICY IF EXISTS "Users can upload assignment files" ON storage.objects;
CREATE POLICY "Users can upload assignment files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moodle-assignments'
  AND (
    is_admin()
    OR split_part(name, '/', 1) = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can update assignment files" ON storage.objects;
CREATE POLICY "Users can update assignment files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'moodle-assignments'
  AND (
    is_admin()
    OR split_part(name, '/', 1) = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'moodle-assignments'
  AND (
    is_admin()
    OR split_part(name, '/', 1) = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can delete assignment files" ON storage.objects;
CREATE POLICY "Users can delete assignment files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moodle-assignments'
  AND (
    is_admin()
    OR split_part(name, '/', 1) = auth.uid()::text
  )
);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assignments_updated_at ON assignments;
CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignments_updated_at();

CREATE OR REPLACE FUNCTION update_assignment_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assignment_submissions_updated_at ON assignment_submissions;
CREATE TRIGGER assignment_submissions_updated_at
  BEFORE UPDATE ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_assignment_submissions_updated_at();
