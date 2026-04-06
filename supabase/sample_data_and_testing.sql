-- =====================================================
-- SAMPLE DATA AND TESTING QUERIES
-- Use these queries for testing the new fields
-- =====================================================

-- =====================================================
-- 1. VIEW CURRENT SCHEMA
-- =====================================================

-- Check all columns in students table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;

-- =====================================================
-- 2. INSERT SAMPLE STUDENT WITH ALL FIELDS
-- =====================================================

-- Note: Replace UUIDs and adjust values as needed
INSERT INTO students (
    register_no,
    name,
    email,
    phone,
    date_of_birth,
    date_of_joining,
    gender,
    blood_group,
    department,
    branch,
    batch,
    section,
    current_year,
    semester,
    credits_earned,
    backlogs,
    permanent_address,
    communication_address,
    father_name,
    mother_name,
    guardian_name,
    guardian_phone
) VALUES (
    '2021CSE001',
    'John Doe',
    'john.doe@student.rit.edu',
    '+91-9876543210',
    '2003-05-15',
    '2021-08-01',
    'Male',
    'B+',
    'Computer Science and Engineering',
    'Artificial Intelligence',
    '2021-2025',
    'A',
    3,
    5,
    85,
    0,
    '123 Main Street, Hometown, Tamil Nadu - 600001',
    'Room 201, Hostel Block A, RIT Campus, Chennai - 600100',
    'John Doe Sr.',
    'Jane Doe',
    'John Doe Sr.',
    '+91-9876543211'
);

-- =====================================================
-- 3. UPDATE EXISTING STUDENT WITH NEW FIELDS
-- =====================================================

-- Update a student by register number
UPDATE students
SET
    date_of_joining = '2020-08-15',
    branch = 'Data Science',
    permanent_address = '456 Park Avenue, City Name, State - 123456',
    communication_address = 'Room 302, Hostel B, College Campus',
    father_name = 'Rajesh Kumar',
    mother_name = 'Priya Kumar',
    guardian_name = 'Rajesh Kumar',
    guardian_phone = '+91-9123456789',
    credits_earned = 120,
    backlogs = 1
WHERE register_no = '2020CSE001'; -- Replace with actual register number

-- =====================================================
-- 4. BULK UPDATE SAMPLE DATA
-- =====================================================

-- Add random data to existing students (for testing)
UPDATE students
SET
    date_of_joining = '2021-08-01'
WHERE date_of_joining IS NULL;

UPDATE students
SET
    branch = department || ' - General'
WHERE branch IS NULL AND department IS NOT NULL;

UPDATE students
SET
    credits_earned = (current_year - 1) * 40
WHERE credits_earned = 0 AND current_year IS NOT NULL;

-- =====================================================
-- 5. QUERY EXAMPLES FOR TESTING
-- =====================================================

-- Get all students with complete information
SELECT 
    register_no,
    name,
    email,
    department,
    branch,
    semester,
    credits_earned,
    backlogs,
    date_of_joining,
    blood_group,
    father_name,
    mother_name,
    guardian_name,
    guardian_phone,
    permanent_address,
    communication_address
FROM students
ORDER BY register_no;

-- Students with backlogs
SELECT 
    register_no,
    name,
    department,
    semester,
    backlogs,
    credits_earned
FROM students
WHERE backlogs > 0
ORDER BY backlogs DESC;

-- Students by branch
SELECT 
    branch,
    COUNT(*) as student_count,
    AVG(credits_earned) as avg_credits,
    AVG(backlogs) as avg_backlogs
FROM students
WHERE branch IS NOT NULL
GROUP BY branch
ORDER BY student_count DESC;

-- Students who joined in a specific year
SELECT 
    register_no,
    name,
    department,
    date_of_joining,
    EXTRACT(YEAR FROM date_of_joining) as joining_year
FROM students
WHERE date_of_joining >= '2021-01-01' 
  AND date_of_joining < '2022-01-01'
ORDER BY date_of_joining;

-- Students with missing information
SELECT 
    register_no,
    name,
    CASE WHEN father_name IS NULL THEN 'Missing' ELSE 'Present' END as father_info,
    CASE WHEN mother_name IS NULL THEN 'Missing' ELSE 'Present' END as mother_info,
    CASE WHEN permanent_address IS NULL THEN 'Missing' ELSE 'Present' END as address_info,
    CASE WHEN date_of_joining IS NULL THEN 'Missing' ELSE 'Present' END as doj_info
FROM students
WHERE father_name IS NULL 
   OR mother_name IS NULL 
   OR permanent_address IS NULL 
   OR date_of_joining IS NULL;

-- =====================================================
-- 6. VALIDATION QUERIES
-- =====================================================

-- Check for duplicate register numbers
SELECT 
    register_no, 
    COUNT(*) as count
FROM students
GROUP BY register_no
HAVING COUNT(*) > 1;

-- Check for invalid blood groups
SELECT 
    register_no,
    name,
    blood_group
FROM students
WHERE blood_group NOT IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
  AND blood_group IS NOT NULL;

-- Check for negative credits or backlogs
SELECT 
    register_no,
    name,
    credits_earned,
    backlogs
FROM students
WHERE credits_earned < 0 
   OR backlogs < 0;

-- =====================================================
-- 7. STATISTICS QUERIES
-- =====================================================

-- Overall statistics
SELECT 
    COUNT(*) as total_students,
    COUNT(DISTINCT department) as departments,
    COUNT(DISTINCT branch) as branches,
    AVG(credits_earned) as avg_credits,
    SUM(CASE WHEN backlogs > 0 THEN 1 ELSE 0 END) as students_with_backlogs,
    COUNT(CASE WHEN father_name IS NOT NULL THEN 1 END) as with_parent_info,
    COUNT(CASE WHEN permanent_address IS NOT NULL THEN 1 END) as with_address
FROM students;

-- Department-wise statistics
SELECT 
    department,
    COUNT(*) as total_students,
    AVG(credits_earned) as avg_credits,
    AVG(backlogs) as avg_backlogs,
    MIN(date_of_joining) as earliest_join,
    MAX(date_of_joining) as latest_join
FROM students
WHERE department IS NOT NULL
GROUP BY department
ORDER BY total_students DESC;

-- Semester-wise distribution
SELECT 
    semester,
    COUNT(*) as student_count,
    AVG(credits_earned) as avg_credits,
    SUM(CASE WHEN backlogs > 0 THEN 1 ELSE 0 END) as with_backlogs
FROM students
WHERE semester IS NOT NULL
GROUP BY semester
ORDER BY semester;

-- =====================================================
-- 8. DATA EXPORT QUERIES
-- =====================================================

-- Full student information export (CSV friendly)
SELECT 
    register_no as "Register Number",
    name as "Name",
    email as "Email",
    phone as "Phone",
    gender as "Gender",
    blood_group as "Blood Group",
    date_of_birth as "Date of Birth",
    date_of_joining as "Date of Joining",
    department as "Department",
    branch as "Branch",
    batch as "Batch",
    section as "Section",
    current_year as "Year",
    semester as "Semester",
    credits_earned as "Credits Earned",
    backlogs as "Backlogs",
    father_name as "Father Name",
    mother_name as "Mother Name",
    guardian_name as "Guardian Name",
    guardian_phone as "Guardian Phone",
    permanent_address as "Permanent Address",
    communication_address as "Communication Address"
FROM students
ORDER BY register_no;

-- =====================================================
-- 9. CLEANUP QUERIES (Use with caution!)
-- =====================================================

-- Clear all new fields for a specific student (for testing)
/*
UPDATE students
SET
    father_name = NULL,
    mother_name = NULL,
    guardian_name = NULL,
    guardian_phone = NULL,
    permanent_address = NULL,
    communication_address = NULL,
    date_of_joining = NULL,
    branch = NULL,
    credits_earned = 0,
    backlogs = 0
WHERE register_no = 'STUDENT_REG_NO';
*/

-- =====================================================
-- 10. TESTING REALTIME UPDATES
-- =====================================================

-- Update a student and watch for realtime changes
-- Run this in one window while having the student view open in browser
UPDATE students
SET
    father_name = 'Updated Father Name',
    credits_earned = credits_earned + 5,
    updated_at = CURRENT_TIMESTAMP
WHERE register_no = '2021CSE001'; -- Replace with test student

-- =====================================================
-- 11. PERFORMANCE CHECK
-- =====================================================

-- Check if indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'students'
  AND (indexname LIKE '%date_of_joining%' OR indexname LIKE '%branch%');

-- Query performance test
EXPLAIN ANALYZE
SELECT *
FROM students
WHERE date_of_joining >= '2021-01-01'
  AND branch LIKE '%Computer%'
  AND backlogs = 0;

-- =====================================================
-- 12. ROW LEVEL SECURITY CHECK
-- =====================================================

-- Check existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'students';

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'students';

-- =====================================================
-- 13. AUDIT TRAIL (Optional Enhancement)
-- =====================================================

-- Create audit table (optional for tracking changes)
/*
CREATE TABLE IF NOT EXISTS student_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id),
    changed_by UUID REFERENCES admins(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT
);

-- Create trigger function for audit
CREATE OR REPLACE FUNCTION audit_student_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.father_name IS DISTINCT FROM OLD.father_name THEN
        INSERT INTO student_audit (student_id, field_name, old_value, new_value)
        VALUES (NEW.id, 'father_name', OLD.father_name, NEW.father_name);
    END IF;
    -- Add similar checks for other fields
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER student_changes_audit
AFTER UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION audit_student_changes();
*/

-- =====================================================
-- NOTES
-- =====================================================

-- 1. Always test updates on a small dataset first
-- 2. Backup your data before running bulk updates
-- 3. Replace placeholder values (register numbers, UUIDs) with actual data
-- 4. Use transactions for multiple related updates
-- 5. Monitor query performance with EXPLAIN ANALYZE
-- 6. Keep RLS policies updated for security
