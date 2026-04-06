-- =====================================================
-- RIT STUDENT PORTAL - ROW LEVEL SECURITY (RLS) POLICIES
-- Run this AFTER creating the schema
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current student ID from user_id
CREATE OR REPLACE FUNCTION get_student_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM students WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STUDENTS TABLE POLICIES
-- =====================================================

-- Students can view their own profile
DROP POLICY IF EXISTS "Students can view own profile" ON students;
CREATE POLICY "Students can view own profile"
ON students FOR SELECT
USING (user_id = auth.uid());

-- Students can update their own profile
DROP POLICY IF EXISTS "Students can update own profile" ON students;
CREATE POLICY "Students can update own profile"
ON students FOR UPDATE
USING (user_id = auth.uid());

-- Admins can view all students
DROP POLICY IF EXISTS "Admins can view all students" ON students;
CREATE POLICY "Admins can view all students"
ON students FOR SELECT
USING (is_admin());

-- Admins can insert students
DROP POLICY IF EXISTS "Admins can insert students" ON students;
CREATE POLICY "Admins can insert students"
ON students FOR INSERT
WITH CHECK (is_admin());

-- Admins can update students
DROP POLICY IF EXISTS "Admins can update students" ON students;
CREATE POLICY "Admins can update students"
ON students FOR UPDATE
USING (is_admin());

-- Admins can delete students
DROP POLICY IF EXISTS "Admins can delete students" ON students;
CREATE POLICY "Admins can delete students"
ON students FOR DELETE
USING (is_admin());

-- =====================================================
-- ADMINS TABLE POLICIES
-- =====================================================

-- Admins can view their own profile
DROP POLICY IF EXISTS "Admins can view own profile" ON admins;
CREATE POLICY "Admins can view own profile"
ON admins FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all admins
DROP POLICY IF EXISTS "Admins can view all admins" ON admins;
CREATE POLICY "Admins can view all admins"
ON admins FOR SELECT
USING (is_admin());

-- =====================================================
-- SUBJECTS TABLE POLICIES
-- =====================================================

-- Everyone can view active subjects
DROP POLICY IF EXISTS "Everyone can view active subjects" ON subjects;
CREATE POLICY "Everyone can view active subjects"
ON subjects FOR SELECT
USING (is_active = true);

-- Admins can manage subjects
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;
CREATE POLICY "Admins can manage subjects"
ON subjects FOR ALL
USING (is_admin());

-- =====================================================
-- STUDENT_SUBJECTS TABLE POLICIES
-- =====================================================

-- Students can view their own subject registrations
DROP POLICY IF EXISTS "Students can view own subject registrations" ON student_subjects;
CREATE POLICY "Students can view own subject registrations"
ON student_subjects FOR SELECT
USING (student_id = get_student_id());

-- Admins can manage all subject registrations
DROP POLICY IF EXISTS "Admins can manage subject registrations" ON student_subjects;
CREATE POLICY "Admins can manage subject registrations"
ON student_subjects FOR ALL
USING (is_admin());

-- =====================================================
-- ATTENDANCE TABLE POLICIES
-- =====================================================

-- Students can view their own attendance
DROP POLICY IF EXISTS "Students can view own attendance" ON attendance;
CREATE POLICY "Students can view own attendance"
ON attendance FOR SELECT
USING (student_id = get_student_id());

-- Admins can view all attendance
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;
CREATE POLICY "Admins can view all attendance"
ON attendance FOR SELECT
USING (is_admin());

-- Admins can insert attendance
DROP POLICY IF EXISTS "Admins can insert attendance" ON attendance;
CREATE POLICY "Admins can insert attendance"
ON attendance FOR INSERT
WITH CHECK (is_admin());

-- Admins can update attendance
DROP POLICY IF EXISTS "Admins can update attendance" ON attendance;
CREATE POLICY "Admins can update attendance"
ON attendance FOR UPDATE
USING (is_admin());

-- Admins can delete attendance
DROP POLICY IF EXISTS "Admins can delete attendance" ON attendance;
CREATE POLICY "Admins can delete attendance"
ON attendance FOR DELETE
USING (is_admin());

-- =====================================================
-- CAT MARKS TABLE POLICIES
-- =====================================================

-- Students can view their own CAT marks
DROP POLICY IF EXISTS "Students can view own cat marks" ON cat_marks;
CREATE POLICY "Students can view own cat marks"
ON cat_marks FOR SELECT
USING (student_id = get_student_id());

-- Admins can manage all CAT marks
DROP POLICY IF EXISTS "Admins can manage cat marks" ON cat_marks;
CREATE POLICY "Admins can manage cat marks"
ON cat_marks FOR ALL
USING (is_admin());

-- =====================================================
-- LAB MARKS TABLE POLICIES
-- =====================================================

-- Students can view their own lab marks
DROP POLICY IF EXISTS "Students can view own lab marks" ON lab_marks;
CREATE POLICY "Students can view own lab marks"
ON lab_marks FOR SELECT
USING (student_id = get_student_id());

-- Admins can manage all lab marks
DROP POLICY IF EXISTS "Admins can manage lab marks" ON lab_marks;
CREATE POLICY "Admins can manage lab marks"
ON lab_marks FOR ALL
USING (is_admin());

-- =====================================================
-- ASSIGNMENTS TABLE POLICIES
-- =====================================================

-- Students can view assignments
DROP POLICY IF EXISTS "Students can view assignments" ON assignments;
CREATE POLICY "Students can view assignments"
ON assignments FOR SELECT
USING (true);

-- Admins can manage assignments
DROP POLICY IF EXISTS "Admins can manage assignments" ON assignments;
CREATE POLICY "Admins can manage assignments"
ON assignments FOR ALL
USING (is_admin());

-- =====================================================
-- ASSIGNMENT SUBMISSIONS TABLE POLICIES
-- =====================================================

-- Students can view their own submissions
DROP POLICY IF EXISTS "Students can view own submissions" ON assignment_submissions;
CREATE POLICY "Students can view own submissions"
ON assignment_submissions FOR SELECT
USING (student_id = get_student_id());

-- Students can insert their own submissions
DROP POLICY IF EXISTS "Students can insert own submissions" ON assignment_submissions;
CREATE POLICY "Students can insert own submissions"
ON assignment_submissions FOR INSERT
WITH CHECK (student_id = get_student_id());

-- Admins can view all submissions
DROP POLICY IF EXISTS "Admins can view all submissions" ON assignment_submissions;
CREATE POLICY "Admins can view all submissions"
ON assignment_submissions FOR SELECT
USING (is_admin());

-- Admins can update submissions (for grading)
DROP POLICY IF EXISTS "Admins can update submissions" ON assignment_submissions;
CREATE POLICY "Admins can update submissions"
ON assignment_submissions FOR UPDATE
USING (is_admin());

-- =====================================================
-- GRADE BOOK TABLE POLICIES
-- =====================================================

-- Students can view their own grades
DROP POLICY IF EXISTS "Students can view own grades" ON grade_book;
CREATE POLICY "Students can view own grades"
ON grade_book FOR SELECT
USING (student_id = get_student_id());

-- Admins can manage all grades
DROP POLICY IF EXISTS "Admins can manage grades" ON grade_book;
CREATE POLICY "Admins can manage grades"
ON grade_book FOR ALL
USING (is_admin());

-- =====================================================
-- SUBJECT GRADES TABLE POLICIES
-- =====================================================

-- Students can view their own subject grades
DROP POLICY IF EXISTS "Students can view own subject grades" ON subject_grades;
CREATE POLICY "Students can view own subject grades"
ON subject_grades FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM grade_book 
    WHERE grade_book.id = subject_grades.grade_book_id 
    AND grade_book.student_id = get_student_id()
  )
);

-- Admins can manage all subject grades
DROP POLICY IF EXISTS "Admins can manage subject grades" ON subject_grades;
CREATE POLICY "Admins can manage subject grades"
ON subject_grades FOR ALL
USING (is_admin());

-- =====================================================
-- FEE STRUCTURES TABLE POLICIES
-- =====================================================

-- Everyone can view fee structures
DROP POLICY IF EXISTS "Everyone can view fee structures" ON fee_structures;
CREATE POLICY "Everyone can view fee structures"
ON fee_structures FOR SELECT
USING (true);

-- Admins can manage fee structures
DROP POLICY IF EXISTS "Admins can manage fee structures" ON fee_structures;
CREATE POLICY "Admins can manage fee structures"
ON fee_structures FOR ALL
USING (is_admin());

-- =====================================================
-- STUDENT FEES TABLE POLICIES
-- =====================================================

-- Students can view their own fees
DROP POLICY IF EXISTS "Students can view own fees" ON student_fees;
CREATE POLICY "Students can view own fees"
ON student_fees FOR SELECT
USING (student_id = get_student_id());

-- Admins can manage all student fees
DROP POLICY IF EXISTS "Admins can manage student fees" ON student_fees;
CREATE POLICY "Admins can manage student fees"
ON student_fees FOR ALL
USING (is_admin());

-- =====================================================
-- FEE PAYMENTS TABLE POLICIES
-- =====================================================

-- Students can view their own fee payments
DROP POLICY IF EXISTS "Students can view own fee payments" ON fee_payments;
CREATE POLICY "Students can view own fee payments"
ON fee_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM student_fees 
    WHERE student_fees.id = fee_payments.student_fee_id 
    AND student_fees.student_id = get_student_id()
  )
);

-- Admins can manage all fee payments
DROP POLICY IF EXISTS "Admins can manage fee payments" ON fee_payments;
CREATE POLICY "Admins can manage fee payments"
ON fee_payments FOR ALL
USING (is_admin());

-- =====================================================
-- TIMETABLE TABLE POLICIES
-- =====================================================

-- Students can view timetable for their department/semester/section
DROP POLICY IF EXISTS "Students can view own timetable" ON timetable;
CREATE POLICY "Students can view own timetable"
ON timetable FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.id = get_student_id()
    AND students.department = timetable.department
    AND students.semester = timetable.semester
    AND students.section = timetable.section
  )
);

-- Admins can manage all timetables
DROP POLICY IF EXISTS "Admins can manage timetables" ON timetable;
CREATE POLICY "Admins can manage timetables"
ON timetable FOR ALL
USING (is_admin());

-- =====================================================
-- LEAVE REQUESTS TABLE POLICIES
-- =====================================================

-- Students can view their own leave requests
DROP POLICY IF EXISTS "Students can view own leave requests" ON leave_requests;
CREATE POLICY "Students can view own leave requests"
ON leave_requests FOR SELECT
USING (student_id = get_student_id());

-- Students can insert their own leave requests
DROP POLICY IF EXISTS "Students can insert leave requests" ON leave_requests;
CREATE POLICY "Students can insert leave requests"
ON leave_requests FOR INSERT
WITH CHECK (student_id = get_student_id());

-- Admins can view all leave requests
DROP POLICY IF EXISTS "Admins can view all leave requests" ON leave_requests;
CREATE POLICY "Admins can view all leave requests"
ON leave_requests FOR SELECT
USING (is_admin());

-- Admins can update leave requests (approve/reject)
DROP POLICY IF EXISTS "Admins can update leave requests" ON leave_requests;
CREATE POLICY "Admins can update leave requests"
ON leave_requests FOR UPDATE
USING (is_admin());

-- =====================================================
-- CERTIFICATE REQUESTS TABLE POLICIES
-- =====================================================

-- Students can view their own certificate requests
DROP POLICY IF EXISTS "Students can view own certificate requests" ON certificate_requests;
CREATE POLICY "Students can view own certificate requests"
ON certificate_requests FOR SELECT
USING (student_id = get_student_id());

-- Students can insert certificate requests
DROP POLICY IF EXISTS "Students can insert certificate requests" ON certificate_requests;
CREATE POLICY "Students can insert certificate requests"
ON certificate_requests FOR INSERT
WITH CHECK (student_id = get_student_id());

-- Admins can view all certificate requests
DROP POLICY IF EXISTS "Admins can view all certificate requests" ON certificate_requests;
CREATE POLICY "Admins can view all certificate requests"
ON certificate_requests FOR SELECT
USING (is_admin());

-- Admins can update certificate requests
DROP POLICY IF EXISTS "Admins can update certificate requests" ON certificate_requests;
CREATE POLICY "Admins can update certificate requests"
ON certificate_requests FOR UPDATE
USING (is_admin());

-- =====================================================
-- FEEDBACK FORMS TABLE POLICIES
-- =====================================================

-- Everyone can view active feedback forms
DROP POLICY IF EXISTS "Everyone can view active feedback forms" ON feedback_forms;
CREATE POLICY "Everyone can view active feedback forms"
ON feedback_forms FOR SELECT
USING (is_active = true);

-- Admins can manage feedback forms
DROP POLICY IF EXISTS "Admins can manage feedback forms" ON feedback_forms;
CREATE POLICY "Admins can manage feedback forms"
ON feedback_forms FOR ALL
USING (is_admin());

-- =====================================================
-- FEEDBACK RESPONSES TABLE POLICIES
-- =====================================================

-- Students can view their own feedback responses
DROP POLICY IF EXISTS "Students can view own feedback responses" ON feedback_responses;
CREATE POLICY "Students can view own feedback responses"
ON feedback_responses FOR SELECT
USING (student_id = get_student_id());

-- Students can insert their own feedback responses
DROP POLICY IF EXISTS "Students can insert feedback responses" ON feedback_responses;
CREATE POLICY "Students can insert feedback responses"
ON feedback_responses FOR INSERT
WITH CHECK (student_id = get_student_id());

-- Admins can view all feedback responses
DROP POLICY IF EXISTS "Admins can view all feedback responses" ON feedback_responses;
CREATE POLICY "Admins can view all feedback responses"
ON feedback_responses FOR SELECT
USING (is_admin());

-- =====================================================
-- MESSAGES TABLE POLICIES
-- =====================================================

-- Students can view messages targeted to them
DROP POLICY IF EXISTS "Students can view targeted messages" ON messages;
CREATE POLICY "Students can view targeted messages"
ON messages FOR SELECT
USING (
  is_active = true AND (
    target_type = 'All' OR
    (target_type = 'Department' AND target_filter->>'department' = (SELECT department FROM students WHERE id = get_student_id())) OR
    (target_type = 'Batch' AND target_filter->>'batch' = (SELECT batch FROM students WHERE id = get_student_id())) OR
    (target_type = 'Semester' AND (target_filter->>'semester')::int = (SELECT semester FROM students WHERE id = get_student_id())) OR
    (target_type = 'Individual' AND (target_filter->>'student_id')::uuid = get_student_id())
  )
);

-- Admins can manage all messages
DROP POLICY IF EXISTS "Admins can manage messages" ON messages;
CREATE POLICY "Admins can manage messages"
ON messages FOR ALL
USING (is_admin());

-- =====================================================
-- MESSAGE READS TABLE POLICIES
-- =====================================================

-- Students can manage their own message reads
DROP POLICY IF EXISTS "Students can manage own message reads" ON message_reads;
CREATE POLICY "Students can manage own message reads"
ON message_reads FOR ALL
USING (student_id = get_student_id());

-- Admins can view all message reads (analytics)
DROP POLICY IF EXISTS "Admins can view message reads" ON message_reads;
CREATE POLICY "Admins can view message reads"
ON message_reads FOR SELECT
USING (is_admin());

-- =====================================================
-- NOTIFICATIONS TABLE POLICIES
-- =====================================================

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- Admins can insert notifications for any user
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
CREATE POLICY "Admins can insert notifications"
ON notifications FOR INSERT
WITH CHECK (is_admin());

-- =====================================================
-- ACTIVITY LOGS TABLE POLICIES
-- =====================================================

-- Users can view their own activity logs
DROP POLICY IF EXISTS "Users can view own activity logs" ON activity_logs;
CREATE POLICY "Users can view own activity logs"
ON activity_logs FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all activity logs
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;
CREATE POLICY "Admins can view all activity logs"
ON activity_logs FOR SELECT
USING (is_admin());

-- Anyone can insert activity logs (system generated)
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON activity_logs;
CREATE POLICY "Anyone can insert activity logs"
ON activity_logs FOR INSERT
WITH CHECK (true);

-- =====================================================
-- ✅ RLS POLICIES COMPLETE!
-- Next: Enable real-time on tables
-- =====================================================
