-- Common SQL queries for managing the academic calendar
-- Use these in Supabase SQL Editor for bulk operations

-- ============================================
-- VIEWING DATA
-- ============================================

-- View all calendar data for a specific month
SELECT 
  date_number, 
  day_type, 
  event_name, 
  assignment, 
  unit, 
  cumulative_days
FROM academic_calendar
WHERE month_name = 'JANUARY' AND year = 2026
ORDER BY date_number;

-- View all CAT dates
SELECT 
  month_name, 
  date_number, 
  event_name, 
  cumulative_days
FROM academic_calendar
WHERE day_type = 'cat'
ORDER BY year, month_name, date_number;

-- View all holidays
SELECT 
  month_name, 
  date_number, 
  event_name
FROM academic_calendar
WHERE day_type = 'holiday'
ORDER BY year, month_name, date_number;

-- Count working days by month
SELECT 
  month_name,
  COUNT(*) as working_days
FROM academic_calendar
WHERE day_type = 'working'
GROUP BY month_name
ORDER BY 
  CASE month_name
    WHEN 'JANUARY' THEN 1
    WHEN 'FEBRUARY' THEN 2
    WHEN 'MARCH' THEN 3
    WHEN 'APRIL' THEN 4
    WHEN 'MAY' THEN 5
  END;

-- Total working days in semester
SELECT COUNT(*) as total_working_days
FROM academic_calendar
WHERE day_type = 'working';

-- View all assignments
SELECT 
  month_name,
  date_number,
  assignment
FROM academic_calendar
WHERE assignment IS NOT NULL
ORDER BY year, month_name, date_number;

-- ============================================
-- BULK UPDATES
-- ============================================

-- Update all Saturdays to weekend (if they're currently working days)
-- Note: This is an example - adjust based on your start_day and date patterns
UPDATE academic_calendar
SET day_type = 'weekend'
WHERE day_type = 'working'
  AND (date_number + start_day - 1) % 7 = 6; -- Saturday

-- Update all Sundays to weekend
UPDATE academic_calendar
SET day_type = 'weekend'
WHERE day_type = 'working'
  AND (date_number + start_day - 1) % 7 = 0; -- Sunday

-- Mark a specific date as holiday across all occurrences
UPDATE academic_calendar
SET 
  day_type = 'holiday',
  event_name = 'National Holiday'
WHERE date_number = 26 AND month_name = 'JANUARY';

-- Update cumulative days for February (example)
UPDATE academic_calendar
SET cumulative_days = cumulative_days + 5
WHERE month_name IN ('FEBRUARY', 'MARCH', 'APRIL', 'MAY')
  AND year = 2026;

-- ============================================
-- ADDING NEW DATA
-- ============================================

-- Add a new month (JUNE 2026 example)
-- First, determine the start day for June 1, 2026
-- Then insert all dates

INSERT INTO academic_calendar (month_name, year, date_number, start_day, day_type, cumulative_days)
SELECT 
  'JUNE' as month_name,
  2026 as year,
  generate_series as date_number,
  1 as start_day, -- June 1, 2026 is Monday
  'working' as day_type,
  80 as cumulative_days
FROM generate_series(1, 30); -- June has 30 days

-- Add a special event day
INSERT INTO academic_calendar (month_name, year, date_number, start_day, day_type, event_name, cumulative_days)
VALUES ('JUNE', 2026, 15, 1, 'club', 'Sports Day', 85)
ON CONFLICT (month_name, year, date_number) 
DO UPDATE SET 
  day_type = EXCLUDED.day_type,
  event_name = EXCLUDED.event_name;

-- ============================================
-- DELETING DATA
-- ============================================

-- Delete a specific month
DELETE FROM academic_calendar
WHERE month_name = 'JUNE' AND year = 2026;

-- Delete all data (use with caution!)
-- Uncomment the next line to execute
-- DELETE FROM academic_calendar;

-- Delete only exam days (if you want to re-schedule them)
DELETE FROM academic_calendar
WHERE day_type IN ('practical', 'theory');

-- ============================================
-- MAINTENANCE
-- ============================================

-- Find days without cumulative_days set
SELECT 
  month_name,
  date_number,
  day_type
FROM academic_calendar
WHERE cumulative_days IS NULL OR cumulative_days = 0
ORDER BY year, month_name, date_number;

-- Find duplicate entries (should not exist due to unique constraint)
SELECT 
  month_name,
  year,
  date_number,
  COUNT(*) as count
FROM academic_calendar
GROUP BY month_name, year, date_number
HAVING COUNT(*) > 1;

-- View recent changes (last 10 edits)
SELECT 
  month_name,
  date_number,
  day_type,
  event_name,
  updated_at,
  updated_by
FROM academic_calendar
WHERE updated_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================
-- REPORTS
-- ============================================

-- Calendar summary report
SELECT 
  month_name,
  COUNT(*) as total_days,
  SUM(CASE WHEN day_type = 'working' THEN 1 ELSE 0 END) as working_days,
  SUM(CASE WHEN day_type = 'holiday' THEN 1 ELSE 0 END) as holidays,
  SUM(CASE WHEN day_type = 'cat' THEN 1 ELSE 0 END) as cat_days,
  SUM(CASE WHEN assignment IS NOT NULL THEN 1 ELSE 0 END) as assignment_days
FROM academic_calendar
WHERE year = 2026
GROUP BY month_name
ORDER BY 
  CASE month_name
    WHEN 'JANUARY' THEN 1
    WHEN 'FEBRUARY' THEN 2
    WHEN 'MARCH' THEN 3
    WHEN 'APRIL' THEN 4
    WHEN 'MAY' THEN 5
    WHEN 'JUNE' THEN 6
  END;

-- Event type distribution
SELECT 
  day_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM academic_calendar
GROUP BY day_type
ORDER BY count DESC;

-- ============================================
-- VALIDATION
-- ============================================

-- Check if all dates in a month are present
WITH date_range AS (
  SELECT 
    'JANUARY' as month_name,
    2026 as year,
    generate_series(1, 31) as expected_date
)
SELECT 
  dr.expected_date,
  ac.date_number,
  CASE 
    WHEN ac.date_number IS NULL THEN 'MISSING'
    ELSE 'EXISTS'
  END as status
FROM date_range dr
LEFT JOIN academic_calendar ac 
  ON dr.month_name = ac.month_name 
  AND dr.year = ac.year 
  AND dr.expected_date = ac.date_number
ORDER BY dr.expected_date;

-- ============================================
-- BACKUP & RESTORE
-- ============================================

-- Create a backup table
CREATE TABLE academic_calendar_backup AS
SELECT * FROM academic_calendar;

-- Restore from backup (be careful!)
-- Uncomment to execute:
-- DELETE FROM academic_calendar;
-- INSERT INTO academic_calendar SELECT * FROM academic_calendar_backup;

-- ============================================
-- PERMISSIONS CHECK
-- ============================================

-- Verify RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'academic_calendar';

-- Check if realtime is enabled
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'academic_calendar';
