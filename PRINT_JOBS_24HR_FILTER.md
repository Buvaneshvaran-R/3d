# Print Jobs - 24 Hour Auto-Hide Feature

## Overview
This update adds automatic filtering of completed print jobs older than 24 hours in the printer's portal, keeping the interface clean and focused on recent completions.

## Database Migration Required

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the migration file: `supabase/22_print_jobs_completed_at.sql`

### Option 2: Via Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Manual SQL Execution
Run this SQL in your Supabase SQL Editor:

```sql
-- Add completed_at column
ALTER TABLE print_jobs
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update existing completed jobs
UPDATE print_jobs
SET completed_at = submitted_at
WHERE status = 'completed' AND completed_at IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_print_jobs_status_completed_at 
  ON print_jobs(status, completed_at DESC)
  WHERE status = 'completed';
```

## Changes Made

### 1. Database Schema
- Added `completed_at` timestamp column to `print_jobs` table
- Added index for efficient filtering
- Backfilled existing completed jobs with `submitted_at` as fallback

### 2. Frontend Updates (PrintKeeperPortal.tsx)
- Added `completedAt` field to `PrintJob` interface
- Updated `dbToJob()` mapper to include `completed_at`
- Modified `handleMarkDone()` to record completion timestamp
- Updated `completedJobs` filter to exclude jobs older than 24 hours

### 3. How It Works
- When a job is marked as "Done", the current timestamp is saved to `completed_at`
- The completed jobs list only shows jobs completed within the last 24 hours
- Older jobs are automatically hidden (not deleted, just filtered from view)
- Falls back to `submitted_at` if `completed_at` is missing (for backwards compatibility)

## Benefits
✅ Keeps printer portal clean and organized  
✅ Focuses on recent completions  
✅ Improves performance by reducing displayed items  
✅ Historical data remains in database for reports  
✅ Automatic - no manual cleanup needed  

## Testing
After applying the migration:
1. Mark a job as "Done" in the printer portal
2. Verify it appears in "Completed Jobs" section
3. The job will automatically disappear after 24 hours

## Rollback
If needed, remove the column:
```sql
ALTER TABLE print_jobs DROP COLUMN IF EXISTS completed_at;
DROP INDEX IF EXISTS idx_print_jobs_status_completed_at;
```
