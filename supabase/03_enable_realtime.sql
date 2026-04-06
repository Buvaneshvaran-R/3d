-- =====================================================
-- RIT STUDENT PORTAL - ENABLE REAL-TIME
-- Run this AFTER RLS policies
-- =====================================================

-- Enable real-time on all tables where data changes should trigger updates

-- =====================================================
-- ENABLE REAL-TIME REPLICATION
-- =====================================================

-- Attendance (admin marks → student sees instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- Students (admin updates photo/info → student sees instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE students;

-- CAT Marks (admin enters → student sees instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE cat_marks;

-- Lab Marks (admin enters → student sees instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE lab_marks;

-- Assignment Submissions (student submits → admin sees)
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_submissions;

-- Assignments (admin posts → student sees)
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;

-- Grade Book (admin updates → student sees)
ALTER PUBLICATION supabase_realtime ADD TABLE grade_book;

-- Subject Grades (admin updates → student sees)
ALTER PUBLICATION supabase_realtime ADD TABLE subject_grades;

-- Student Fees (admin updates → student sees)
ALTER PUBLICATION supabase_realtime ADD TABLE student_fees;

-- Fee Payments (admin records → student sees)
ALTER PUBLICATION supabase_realtime ADD TABLE fee_payments;

-- Timetable (admin updates → student sees)
ALTER PUBLICATION supabase_realtime ADD TABLE timetable;

-- Leave Requests (student submits → admin sees, admin approves → student sees)
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;

-- Certificate Requests (student requests → admin sees, admin processes → student sees)
ALTER PUBLICATION supabase_realtime ADD TABLE certificate_requests;

-- Messages (admin posts → student sees)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Notifications (any new notification → user sees)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Feedback Forms (admin creates → student sees)
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_forms;

-- Student Subjects (admin assigns → student sees)
ALTER PUBLICATION supabase_realtime ADD TABLE student_subjects;

-- =====================================================
-- ✅ REAL-TIME ENABLED!
-- All tables now broadcast changes to connected clients
-- =====================================================

-- HOW TO USE IN FRONTEND:
/*

// Example: Listen to attendance changes
const channel = supabase
  .channel('attendance-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE, or *
      schema: 'public',
      table: 'attendance',
      filter: `student_id=eq.${studentId}`,
    },
    (payload) => {
      console.log('Attendance updated!', payload);
      // Refresh your data
    }
  )
  .subscribe();

// Don't forget to unsubscribe
supabase.removeChannel(channel);

*/
