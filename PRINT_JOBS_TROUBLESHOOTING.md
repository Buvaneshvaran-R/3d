# Print Jobs Not Updating - Troubleshooting Guide

## Issue
Jobs marked as "Done" revert to "queued" status after page refresh. Updates are not persisting to the database.

## Root Causes & Solutions

### 1. ⚠️ Database Column Missing (Most Likely)

**Symptom:** Browser console shows error about `completed_at` column

**Cause:** Migration file `22_print_jobs_completed_at.sql` wasn't run

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase/22_print_jobs_completed_at.sql`
3. Click "Run"

**Quick Fix SQL:**
```sql
ALTER TABLE print_jobs
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_print_jobs_status_completed_at 
  ON print_jobs(status, completed_at DESC)
  WHERE status = 'completed';
```

---

### 2. 🔒 RLS Policies Blocking Updates (Very Common)

**Symptom:** 
- Browser console shows: "new row violates row-level security policy"
- Or: "permission denied for table print_jobs"

**Cause:** Row Level Security (RLS) policies not set up for print_jobs table

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run the file: `supabase/23_print_jobs_rls_policies.sql`

**Quick Fix SQL:**
```sql
-- Enable RLS
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Allow admins to update any print job
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

GRANT ALL ON print_jobs TO authenticated;
```

---

### 3. 🔑 Not Logged In as Admin

**Symptom:** Updates fail silently, no specific error

**Cause:** Logged in as student, not as admin/printer

**Solution:**
1. Check which user you're logged in as (top right corner should show username)
2. Logout and login with **admin credentials** (printer portal account)
3. Verify your email exists in the `admins` table

**Check Admin Status:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM admins WHERE email = 'your-email@example.com';
```

If no results, add yourself:
```sql
INSERT INTO admins (email, full_name, role)
VALUES ('your-email@example.com', 'Print Keeper', 'staff');
```

---

### 4. 🗄️ print_jobs Table Doesn't Exist

**Symptom:** Error: "relation 'print_jobs' does not exist"

**Cause:** Table was never created in the database

**Solution:**
Create the print_jobs table:

```sql
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_no INTEGER NOT NULL,
  submitted_by TEXT NOT NULL,
  roll_no TEXT,
  file_name TEXT NOT NULL,
  pages INTEGER NOT NULL,
  copies INTEGER NOT NULL DEFAULT 1,
  color TEXT NOT NULL CHECK (color IN ('bw', 'color')),
  side TEXT NOT NULL CHECK (side IN ('single', 'double')),
  orientation TEXT NOT NULL CHECK (orientation IN ('portrait', 'landscape')),
  binding TEXT NOT NULL CHECK (binding IN ('none', 'soft', 'spiral')),
  print_cost DECIMAL(10, 2) DEFAULT 0,
  binding_cost DECIMAL(10, 2) DEFAULT 0,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('pending_payment', 'queued', 'printing', 'completed', 'cancelled')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  file_url TEXT,
  student_email TEXT,
  payment_id TEXT,
  rejection_reason TEXT,
  is_priority BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_queue_no ON print_jobs(queue_no);
CREATE INDEX IF NOT EXISTS idx_print_jobs_student_email ON print_jobs(student_email);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;
```

---

## Debugging Steps

### Step 1: Open Browser Console
1. Press **F12** (Chrome/Edge) or **Ctrl+Shift+I** (Firefox)
2. Go to **Console** tab
3. Clear console (trash icon)
4. Try marking a job as done
5. Look for red error messages

### Step 2: Check What Error Appears

| Error Message | Solution |
|--------------|----------|
| `column "completed_at" does not exist` | Run migration #22 |
| `new row violates row-level security` | Run migration #23 (RLS policies) |
| `permission denied for table` | Check admin status |
| `relation "print_jobs" does not exist` | Create print_jobs table |
| `Network request failed` | Check internet/Supabase connection |
| No error, but doesn't persist | Check realtime subscription |

### Step 3: Verify Updates in Supabase

1. Go to Supabase Dashboard → Table Editor
2. Select `print_jobs` table
3. Find the job you tried to mark done
4. Check if `status` column shows "completed"
5. Check if `completed_at` has a timestamp

If the table shows "completed" but frontend still shows "queued" → Realtime sync issue

---

## Code Changes Made (Already Applied)

### Enhanced Error Handling
```typescript
const handleMarkDone = async (jobId: string) => {
  // Now includes:
  // - Console logging
  // - Error alerts with detailed messages
  // - Fallback for missing completed_at column
  // - Verification that update succeeded
};
```

### Fallback for Missing Column
If `completed_at` column doesn't exist, the code automatically falls back to updating only the `status` field.

---

## Testing After Fixes

1. **Refresh browser** (hard refresh: Ctrl+F5)
2. **Login to printer portal**
3. **Download a job file**
4. **Click "Mark Done"**
5. **Watch browser console** for success message: "Job marked as done successfully"
6. **DON'T refresh yet** - does job disappear from "Incoming Jobs"?
7. **Check "Completed Jobs"** - does it appear there?
8. **Now refresh page** (F5) - does job stay in "Completed Jobs"?

If steps 1-7 work but step 8 fails → Database update is working, but there's a fetch/sync issue

---

## Quick Diagnostic Commands

Run these in Supabase SQL Editor:

```sql
-- Check if print_jobs table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'print_jobs';

-- Check if completed_at column exists
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'print_jobs' AND column_name = 'completed_at';

-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'print_jobs';

-- List all policies on print_jobs
SELECT * FROM pg_policies WHERE tablename = 'print_jobs';

-- Check recent jobs
SELECT id, queue_no, submitted_by, status, completed_at 
FROM print_jobs 
ORDER BY queue_no DESC 
LIMIT 10;
```

---

## Still Not Working?

If after applying all fixes it still doesn't work:

1. **Check browser console** - Copy the exact error message
2. **Check Supabase logs** - Dashboard → Logs → check for errors
3. **Try with service_role key** - Temporarily test if RLS is the issue
4. **Verify authentication** - Make sure you're logged in as an admin user

### Manual Test Query
Run this in SQL Editor to manually update a job:
```sql
UPDATE print_jobs 
SET status = 'completed', completed_at = NOW() 
WHERE id = 'paste-job-id-here';
```

If this works but the UI doesn't → Frontend/auth issue  
If this fails → Database permissions/RLS issue

---

## Summary Checklist

- [ ] Run migration: `22_print_jobs_completed_at.sql`
- [ ] Run migration: `23_print_jobs_rls_policies.sql`  
- [ ] Verify logged in as admin user
- [ ] Check browser console for errors
- [ ] Hard refresh browser (Ctrl+F5)
- [ ] Test marking a job as done
- [ ] Verify in Supabase table editor that status changed
- [ ] Test that update persists after page refresh

## Contact Info
If you need more help, provide:
1. Screenshot of browser console errors
2. Your Supabase project URL
3. Whether you ran the migration files
4. What user role you're logged in as
