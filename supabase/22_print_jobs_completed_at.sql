-- Add completed_at timestamp to track when jobs are marked as completed
-- This enables filtering out old completed jobs from the printer portal

-- Add completed_at column if it doesn't exist
ALTER TABLE print_jobs
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update existing completed jobs with submitted_at as fallback
-- (for jobs that were completed before this migration)
UPDATE print_jobs
SET completed_at = submitted_at
WHERE status = 'completed' AND completed_at IS NULL;

-- Create index for efficient filtering by status and completion time
CREATE INDEX IF NOT EXISTS idx_print_jobs_status_completed_at 
  ON print_jobs(status, completed_at DESC)
  WHERE status = 'completed';

-- Add comment for documentation
COMMENT ON COLUMN print_jobs.completed_at IS 'Timestamp when job status was changed to completed. Used to auto-hide jobs older than 24 hours in printer portal.';
