-- ============================================
-- PRINT JOBS - COMPLETE FIX SCRIPT
-- Run this in Supabase SQL Editor to fix all update issues
-- ============================================

-- Step 1: Verify print_jobs table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'print_jobs') THEN
    RAISE EXCEPTION 'ERROR: print_jobs table does not exist! Create it first.';
  ELSE
    RAISE NOTICE '✓ print_jobs table exists';
  END IF;
END $$;

-- Step 2: Add completed_at column if missing
ALTER TABLE print_jobs
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing completed jobs
UPDATE print_jobs
SET completed_at = submitted_at
WHERE status = 'completed' AND completed_at IS NULL;

RAISE NOTICE '✓ completed_at column added';

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_print_jobs_status_completed_at 
  ON print_jobs(status, completed_at DESC)
  WHERE status = 'completed';

RAISE NOTICE '✓ Index created';

-- Step 4: Enable RLS
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '✓ RLS enabled';

-- Step 5: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Students can view their own print jobs" ON print_jobs;
DROP POLICY IF EXISTS "Students can insert their own print jobs" ON print_jobs;
DROP POLICY IF EXISTS "Students can update their own pending print jobs" ON print_jobs;
DROP POLICY IF EXISTS "Admins can view all print jobs" ON print_jobs;
DROP POLICY IF EXISTS "Admins can update any print job" ON print_jobs;
DROP POLICY IF EXISTS "Admins can delete print jobs" ON print_jobs;

RAISE NOTICE '✓ Old policies dropped';

-- Step 6: Create new RLS policies

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

RAISE NOTICE '✓ RLS policies created';

-- Step 7: Grant permissions
GRANT ALL ON print_jobs TO authenticated;
GRANT ALL ON print_jobs TO service_role;

RAISE NOTICE '✓ Permissions granted';

-- Step 8: Enable realtime (if not already enabled)
BEGIN;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS print_jobs;
  ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Realtime setup skipped (may already be configured)';
END;

RAISE NOTICE '✓ Realtime enabled';

-- Step 9: Show summary
SELECT 
  'print_jobs' as table_name,
  (SELECT COUNT(*) FROM print_jobs WHERE status = 'queued') as queued_jobs,
  (SELECT COUNT(*) FROM print_jobs WHERE status = 'completed') as completed_jobs,
  (SELECT COUNT(*) FROM print_jobs WHERE status = 'cancelled') as cancelled_jobs,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'print_jobs') as rls_policies,
  pg_size_pretty(pg_total_relation_size('print_jobs')) as table_size;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if your user is an admin
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM admins WHERE email = auth.jwt() ->> 'email') 
    THEN '✓ You are logged in as an ADMIN'
    ELSE '✗ You are NOT an admin - login with admin account!'
  END as admin_status;

-- Show recent jobs
SELECT 
  queue_no, 
  submitted_by, 
  status, 
  submitted_at,
  completed_at,
  student_email
FROM print_jobs 
ORDER BY queue_no DESC 
LIMIT 5;

-- ============================================
-- ALL DONE!
-- ============================================
-- Now try:
-- 1. Refresh your browser (Ctrl+F5)
-- 2. Mark a job as done
-- 3. Check browser console for "Job marked as done successfully"
-- 4. Refresh page - job should stay completed
-- ============================================
