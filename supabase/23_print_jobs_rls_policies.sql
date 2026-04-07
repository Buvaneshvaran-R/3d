-- RLS Policies for print_jobs table
-- Run this if print_jobs table doesn't have RLS policies yet

-- Enable RLS on print_jobs table
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Allow students to view their own jobs
CREATE POLICY "Students can view their own print jobs"
  ON print_jobs
  FOR SELECT
  TO authenticated
  USING (
    student_email = auth.jwt() ->> 'email'
    OR EXISTS (
      SELECT 1 FROM students 
      WHERE students.email = auth.jwt() ->> 'email'
      AND students.email = print_jobs.student_email
    )
  );

-- Allow students to insert their own jobs
CREATE POLICY "Students can insert their own print jobs"
  ON print_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_email = auth.jwt() ->> 'email'
    OR EXISTS (
      SELECT 1 FROM students 
      WHERE students.email = auth.jwt() ->> 'email'
    )
  );

-- Allow students to update their own pending jobs (cancel only)
CREATE POLICY "Students can update their own pending print jobs"
  ON print_jobs
  FOR UPDATE
  TO authenticated
  USING (
    student_email = auth.jwt() ->> 'email'
    AND status IN ('pending_payment', 'queued')
  )
  WITH CHECK (
    student_email = auth.jwt() ->> 'email'
    AND status IN ('pending_payment', 'queued', 'cancelled')
  );

-- Allow admins to view all print jobs
CREATE POLICY "Admins can view all print jobs"
  ON print_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

-- Allow admins to update any print job (mark done, reject, etc.)
CREATE POLICY "Admins can update any print job"
  ON print_jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

-- Allow admins to delete print jobs if needed
CREATE POLICY "Admins can delete print jobs"
  ON print_jobs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

-- Grant necessary permissions
GRANT ALL ON print_jobs TO authenticated;
GRANT ALL ON print_jobs TO service_role;
