-- =====================================================
-- RIT STUDENT PORTAL - SAMPLE DATA FOR TESTING
-- Run this to populate database with test data
-- =====================================================

-- ⚠️ IMPORTANT: First create users in Supabase Auth Dashboard
-- Then note their UUIDs and replace below

-- =====================================================
-- 1. INSERT SAMPLE ADMIN
-- =====================================================
-- ⚠️ INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → Authentication → Users → Add User
-- 2. Create user with email: admin@rit.edu, password: your-password
-- 3. Copy the UUID from the created user
-- 4. Uncomment the line below and replace 'PASTE-ADMIN-UUID-HERE' with the actual UUID
-- 5. Run the INSERT statement

-- INSERT INTO admins (user_id, name, email, phone, designation, department) VALUES
-- ('PASTE-ADMIN-UUID-HERE', 'Dr. Admin Officer', 'admin@rit.edu', '9876543210', 'Academic Coordinator', 'Computer Science and Engineering');

-- =====================================================
-- 2. INSERT SAMPLE STUDENTS
-- =====================================================
-- ⚠️ INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → Authentication → Users → Add User
-- 2. Create users with emails:
--    - arun.kumar@student.rit.edu
--    - priya.sharma@student.rit.edu
--    - rahul.verma@student.rit.edu
-- 3. Copy their UUIDs
-- 4. Uncomment the lines below and replace the PASTE-STUDENT-UUID placeholders
-- 5. Run the INSERT statement

-- INSERT INTO students (user_id, register_no, name, email, phone, date_of_birth, gender, blood_group, department, batch, semester, section, current_year) VALUES
-- ('PASTE-STUDENT-UUID-1-HERE', '2022CS001', 'Arun Kumar', 'arun.kumar@student.rit.edu', '9876543211', '2003-05-15', 'Male', 'B+', 'Computer Science and Engineering', '2022-2026', 5, 'A', 3),
-- ('PASTE-STUDENT-UUID-2-HERE', '2022CS002', 'Priya Sharma', 'priya.sharma@student.rit.edu', '9876543212', '2003-08-20', 'Female', 'O+', 'Computer Science and Engineering', '2022-2026', 5, 'A', 3),
-- ('PASTE-STUDENT-UUID-3-HERE', '2022CS003', 'Rahul Verma', 'rahul.verma@student.rit.edu', '9876543213', '2003-03-10', 'Male', 'A+', 'Computer Science and Engineering', '2022-2026', 5, 'A', 3);

-- =====================================================
-- 3. INSERT SAMPLE SUBJECTS
-- =====================================================
INSERT INTO subjects (code, name, department, semester, credits, type, is_active) VALUES
('CS501', 'Data Structures and Algorithms', 'Computer Science and Engineering', 5, 4, 'Theory', true),
('CS502', 'Database Management Systems', 'Computer Science and Engineering', 5, 4, 'Theory', true),
('CS503', 'Operating Systems', 'Computer Science and Engineering', 5, 4, 'Theory', true),
('CS504', 'Computer Networks', 'Computer Science and Engineering', 5, 3, 'Theory', true),
('CS505L', 'Data Structures Lab', 'Computer Science and Engineering', 5, 2, 'Lab', true),
('CS506L', 'DBMS Lab', 'Computer Science and Engineering', 5, 2, 'Lab', true);

-- =====================================================
-- 4. REGISTER STUDENTS TO SUBJECTS
-- =====================================================
-- Get student and subject IDs first
WITH student_ids AS (
  SELECT id, register_no FROM students WHERE register_no IN ('2022CS001', '2022CS002', '2022CS003')
),
subject_ids AS (
  SELECT id, code FROM subjects WHERE code IN ('CS501', 'CS502', 'CS503', 'CS504', 'CS505L', 'CS506L')
)
INSERT INTO student_subjects (student_id, subject_id, semester, academic_year)
SELECT s.id, sub.id, 5, '2024-2025'
FROM student_ids s
CROSS JOIN subject_ids sub;

-- =====================================================
-- 5. INSERT SAMPLE ATTENDANCE
-- =====================================================
-- Add attendance for last 10 days
WITH student_ids AS (
  SELECT id FROM students WHERE register_no IN ('2022CS001', '2022CS002', '2022CS003')
),
subject_ids AS (
  SELECT id FROM subjects WHERE code = 'CS501'
),
dates AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '9 days',
    CURRENT_DATE,
    INTERVAL '1 day'
  )::date AS date
)
INSERT INTO attendance (student_id, subject_id, date, status)
SELECT s.id, sub.id, d.date, 
  CASE 
    WHEN RANDOM() > 0.2 THEN 'Present'::text
    WHEN RANDOM() > 0.5 THEN 'Absent'::text
    ELSE 'Leave'::text
  END
FROM student_ids s
CROSS JOIN subject_ids sub
CROSS JOIN dates d;

-- =====================================================
-- 6. INSERT SAMPLE CAT MARKS
-- =====================================================
WITH student_ids AS (
  SELECT id FROM students WHERE register_no IN ('2022CS001', '2022CS002', '2022CS003')
),
subject_ids AS (
  SELECT id FROM subjects WHERE code IN ('CS501', 'CS502', 'CS503', 'CS504')
)
INSERT INTO cat_marks (student_id, subject_id, cat_type, marks_obtained, max_marks, exam_date)
SELECT s.id, sub.id, cat_type, 
  (RANDOM() * 40 + 10)::decimal(5,2), -- Random marks between 10-50
  50.00,
  CURRENT_DATE - INTERVAL '30 days'
FROM student_ids s
CROSS JOIN subject_ids sub
CROSS JOIN (VALUES ('CAT1'), ('CAT2')) AS cats(cat_type);

-- =====================================================
-- 7. INSERT SAMPLE LAB MARKS
-- =====================================================
WITH student_ids AS (
  SELECT id FROM students WHERE register_no IN ('2022CS001', '2022CS002', '2022CS003')
),
subject_ids AS (
  SELECT id FROM subjects WHERE code IN ('CS505L', 'CS506L')
)
INSERT INTO lab_marks (student_id, subject_id, internal_marks, max_internal, viva_marks, max_viva, record_marks, max_record)
SELECT s.id, sub.id,
  (RANDOM() * 45 + 15)::decimal(5,2), -- Random internal marks
  60.00,
  (RANDOM() * 15 + 5)::decimal(5,2),  -- Random viva marks
  20.00,
  (RANDOM() * 15 + 5)::decimal(5,2),  -- Random record marks
  20.00
FROM student_ids s
CROSS JOIN subject_ids sub;

-- =====================================================
-- 8. INSERT SAMPLE ASSIGNMENTS
-- =====================================================
WITH subject_id AS (
  SELECT id FROM subjects WHERE code = 'CS501' LIMIT 1
)
INSERT INTO assignments (subject_id, title, description, due_date, max_marks)
SELECT id, title, description, due_date, 10.00
FROM subject_id,
(VALUES 
  ('Assignment 1: Sorting Algorithms', 'Implement Quick Sort and Merge Sort', CURRENT_DATE + INTERVAL '7 days'),
  ('Assignment 2: Binary Trees', 'Implement BST with insert, delete, search', CURRENT_DATE + INTERVAL '14 days'),
  ('Assignment 3: Graph Algorithms', 'Implement BFS and DFS', CURRENT_DATE + INTERVAL '21 days')
) AS a(title, description, due_date);

-- =====================================================
-- 9. INSERT SAMPLE FEE STRUCTURE
-- =====================================================
INSERT INTO fee_structures (department, semester, academic_year, tuition_fee, library_fee, lab_fee, other_fees, total_fee)
VALUES 
('Computer Science and Engineering', 5, '2024-2025', 75000.00, 2000.00, 5000.00, 3000.00, 85000.00);

-- =====================================================
-- 10. ASSIGN FEES TO STUDENTS
-- =====================================================
WITH student_ids AS (
  SELECT id FROM students WHERE register_no IN ('2022CS001', '2022CS002', '2022CS003')
),
fee_struct AS (
  SELECT id, total_fee FROM fee_structures WHERE department = 'Computer Science and Engineering' AND semester = 5 LIMIT 1
)
INSERT INTO student_fees (student_id, fee_structure_id, semester, academic_year, total_amount, paid_amount, balance, payment_status, due_date)
SELECT s.id, f.id, 5, '2024-2025', f.total_fee, 
  CASE 
    WHEN RANDOM() > 0.5 THEN f.total_fee  -- Paid
    ELSE 0.00                              -- Pending
  END as paid,
  CASE 
    WHEN RANDOM() > 0.5 THEN 0.00
    ELSE f.total_fee
  END as balance,
  CASE 
    WHEN RANDOM() > 0.5 THEN 'Paid'::text
    ELSE 'Pending'::text
  END as status,
  CURRENT_DATE + INTERVAL '30 days'
FROM student_ids s
CROSS JOIN fee_struct f;

-- =====================================================
-- 11. INSERT SAMPLE TIMETABLE
-- =====================================================
INSERT INTO timetable (department, semester, section, day_of_week, period_no, start_time, end_time, subject_id, room_no, faculty_name)
SELECT 
  'Computer Science and Engineering', 
  5, 
  'A',
  day,
  period,
  ('09:00:00'::time + ((period - 1) || ' hours')::interval),
  ('09:00:00'::time + (period || ' hours')::interval),
  (SELECT id FROM subjects WHERE code = sub_code LIMIT 1),
  'Block-A ' || (100 + period)::text,
  faculty
FROM (VALUES 
  ('Monday', 1, 'CS501', 'Dr. Rajesh Kumar'),
  ('Monday', 2, 'CS502', 'Dr. Priya Singh'),
  ('Monday', 3, 'CS503', 'Dr. Amit Patel'),
  ('Tuesday', 1, 'CS504', 'Dr. Sneha Reddy'),
  ('Tuesday', 2, 'CS501', 'Dr. Rajesh Kumar'),
  ('Tuesday', 3, 'CS505L', 'Dr. Vijay Sharma'),
  ('Wednesday', 1, 'CS502', 'Dr. Priya Singh'),
  ('Wednesday', 2, 'CS503', 'Dr. Amit Patel'),
  ('Wednesday', 3, 'CS506L', 'Dr. Anita Desai'),
  ('Thursday', 1, 'CS504', 'Dr. Sneha Reddy'),
  ('Thursday', 2, 'CS501', 'Dr. Rajesh Kumar'),
  ('Friday', 1, 'CS505L', 'Dr. Vijay Sharma'),
  ('Friday', 2, 'CS506L', 'Dr. Anita Desai')
) AS tt(day, period, sub_code, faculty);

-- =====================================================
-- 12. INSERT SAMPLE MESSAGE
-- =====================================================
INSERT INTO messages (title, content, message_type, priority, target_type, target_filter, is_active)
VALUES 
('Mid-Semester Break Announcement', 'Mid-semester break from Jan 15-20, 2025. Classes will resume on Jan 21.', 'General', 'High', 'All', NULL, true),
('Assignment Deadline Extended', 'Assignment 1 deadline extended by 3 days due to technical issues.', 'Academic', 'Normal', 'Department', '{"department": "Computer Science and Engineering"}'::jsonb, true);

-- =====================================================
-- 13. INSERT SAMPLE NOTIFICATIONS
-- =====================================================
-- ⚠️ INSTRUCTIONS: Replace PASTE-STUDENT-UUID-1-HERE with the actual UUID from step 2
-- Uncomment the lines below after inserting students

-- INSERT INTO notifications (user_id, title, message, type, is_read)
-- VALUES 
-- ('PASTE-STUDENT-UUID-1-HERE', 'New Assignment Posted', 'Assignment 1: Sorting Algorithms has been posted', 'assignment', false),
-- ('PASTE-STUDENT-UUID-1-HERE', 'Attendance Marked', 'Your attendance for CS501 has been marked as Present', 'attendance', false);

-- =====================================================
-- ✅ SAMPLE DATA SCRIPT COMPLETE!
-- =====================================================

-- SETUP INSTRUCTIONS:
-- 
-- STEP 1: Run this entire script first (it will insert subjects, timetable, etc.)
--
-- STEP 2: Create Auth Users
--   - Go to Supabase Dashboard → Authentication → Users
--   - Click "Add User" for each:
--     * admin@rit.edu (password: Admin@123 or your choice)
--     * arun.kumar@student.rit.edu (password: Student@123 or your choice)
--     * priya.sharma@student.rit.edu (password: Student@123 or your choice)
--     * rahul.verma@student.rit.edu (password: Student@123 or your choice)
--
-- STEP 3: Copy UUIDs and Run Commented Sections
--   - After creating each user, copy their UUID
--   - Go back to sections 1, 2, and 13 above
--   - Uncomment the INSERT statements
--   - Replace the PASTE-UUID-HERE placeholders with actual UUIDs
--   - Run each INSERT statement
--
-- STEP 4: Test the Application
--   - You can now log in with the created users
--   - Students will see their attendance, marks, assignments, etc.
--   - Admin can manage all student data
