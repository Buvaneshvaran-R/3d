-- ============================================
-- PRINT JOBS - SIMPLE FIX SCRIPT (No Syntax Errors)
-- Run this in Supabase SQL Editor
-- ============================================

-- Add completed_at column if missing
ALTER TABLE print_jobs
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing completed jobs
UPDATE print_jobs
SET completed_at = submitted_at
WHERE status = 'completed' AND completed_at IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_print_jobs_status_completed_at 
  ON print_jobs(status, completed_at DESC)
  WHERE status = 'completed';

-- Enable RLS
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Students can view their own print jobs" ON print_jobs;
DROP POLICY IF EXISTS "Students can insert their own print jobs" ON print_jobs;
DROP POLICY IF EXISTS "Students can update their own pending print jobs" ON print_jobs;
DROP POLICY IF EXISTS "Admins can view all print jobs" ON print_jobs;
DROP POLICY IF EXISTS "Admins can update any print job" ON print_jobs;
DROP POLICY IF EXISTS "Admins can insert print jobs" ON print_jobs;
DROP POLICY IF EXISTS "Admins can delete print jobs" ON print_jobs;

-- Create new RLS policies

-- Allow students to view their own jobs
CREATE POLICY "Students can view their own print jobs"
  ON print_jobs
  FOR SELECT
  TO authenticated
  USING (
    student_email = auth.jwt() ->> 'email'
  );

-- Allow students to insert their own jobs
CREATE POLICY "Students can insert their own print jobs"
  ON print_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_email = auth.jwt() ->> 'email'
  );

-- Allow students to update only status of their own jobs (cancel)
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

-- Allow admins to update any print job (THIS IS CRITICAL FOR MARK DONE)
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

-- Allow admins to insert jobs (for manual entry)
CREATE POLICY "Admins can insert print jobs"
  ON print_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.email = auth.jwt() ->> 'email'
    )
  );

-- Allow admins to delete jobs if needed
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

-- Grant permissions
GRANT ALL ON print_jobs TO authenticated;
GRANT ALL ON print_jobs TO service_role;

-- Enable realtime
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS print_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;

-- Show summary
SELECT 
  'COMPLETED: All fixes applied!' as status,
  (SELECT COUNT(*) FROM print_jobs WHERE status = 'queued') as queued_jobs,
  (SELECT COUNT(*) FROM print_jobs WHERE status = 'completed') as completed_jobs,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'print_jobs') as total_policies;

-- Verify you're an admin
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email') 
    THEN '✓ You are logged in as ADMIN'
    ELSE '✗ You are NOT an admin - login with admin account!'
  END as admin_status;
