-- =====================================================
-- RIT STUDENT PORTAL - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. STUDENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    register_no VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(5),
    department VARCHAR(100),
    batch VARCHAR(20),
    semester INT,
    section VARCHAR(10),
    current_year INT,
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_register_no ON students(register_no);
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department);

-- =====================================================
-- 2. ADMINS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    designation VARCHAR(100),
    department VARCHAR(100),
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);

-- =====================================================
-- 3. SUBJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    semester INT,
    credits INT,
    type VARCHAR(20) CHECK (type IN ('Theory', 'Lab', 'Both')),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department);

-- =====================================================
-- 4. STUDENT-SUBJECT REGISTRATION (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS student_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    semester INT NOT NULL,
    academic_year VARCHAR(20),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id, semester)
);

CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject ON student_subjects(subject_id);

-- =====================================================
-- 5. ATTENDANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Present', 'Absent', 'Leave', 'OD')) NOT NULL,
    marked_by UUID REFERENCES admins(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- =====================================================
-- 6. CAT MARKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cat_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    cat_type VARCHAR(10) CHECK (cat_type IN ('CAT1', 'CAT2', 'CAT3')) NOT NULL,
    marks_obtained DECIMAL(5,2),
    max_marks DECIMAL(5,2) DEFAULT 50.00,
    exam_date DATE,
    entered_by UUID REFERENCES admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id, cat_type)
);

CREATE INDEX IF NOT EXISTS idx_cat_marks_student ON cat_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_cat_marks_subject ON cat_marks(subject_id);

-- =====================================================
-- 7. LAB MARKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lab_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    internal_marks DECIMAL(5,2),
    max_internal DECIMAL(5,2) DEFAULT 60.00,
    viva_marks DECIMAL(5,2),
    max_viva DECIMAL(5,2) DEFAULT 20.00,
    record_marks DECIMAL(5,2),
    max_record DECIMAL(5,2) DEFAULT 20.00,
    entered_by UUID REFERENCES admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_marks_student ON lab_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_lab_marks_subject ON lab_marks(subject_id);

-- =====================================================
-- 8. ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    max_marks DECIMAL(5,2) DEFAULT 10.00,
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject_id);

-- =====================================================
-- 9. ASSIGNMENT SUBMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2),
    submitted_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES admins(id),
    graded_at TIMESTAMP WITH TIME ZONE,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id);

-- =====================================================
-- 10. GRADE BOOK TABLE
-- =====================================================
CREATE TABLE grade_book (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    semester INT NOT NULL,
    academic_year VARCHAR(20),
    gpa DECIMAL(3,2),
    cgpa DECIMAL(3,2),
    total_credits INT,
    is_locked BOOLEAN DEFAULT false,
    locked_by UUID REFERENCES admins(id),
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, semester, academic_year)
);

CREATE INDEX idx_grade_book_student ON grade_book(student_id);

-- =====================================================
-- 11. SUBJECT GRADES TABLE
-- =====================================================
CREATE TABLE subject_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_book_id UUID REFERENCES grade_book(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    grade VARCHAR(2),
    grade_points DECIMAL(3,2),
    credits INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subject_grades_grade_book ON subject_grades(grade_book_id);

-- =====================================================
-- 12. FEE STRUCTURES TABLE
-- =====================================================
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department VARCHAR(100),
    semester INT,
    academic_year VARCHAR(20),
    tuition_fee DECIMAL(10,2),
    library_fee DECIMAL(10,2),
    lab_fee DECIMAL(10,2),
    other_fees DECIMAL(10,2),
    total_fee DECIMAL(10,2),
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 13. STUDENT FEES TABLE
-- =====================================================
CREATE TABLE student_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id),
    semester INT NOT NULL,
    academic_year VARCHAR(20),
    total_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    balance DECIMAL(10,2),
    payment_status VARCHAR(20) CHECK (payment_status IN ('Pending', 'Partial', 'Paid')) DEFAULT 'Pending',
    due_date DATE,
    updated_by UUID REFERENCES admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, semester, academic_year)
);

CREATE INDEX idx_student_fees_student ON student_fees(student_id);

-- =====================================================
-- 14. FEE PAYMENTS TABLE
-- =====================================================
CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_fee_id UUID REFERENCES student_fees(id) ON DELETE CASCADE,
    amount DECIMAL(10,2),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    payment_date DATE,
    receipt_no VARCHAR(50),
    recorded_by UUID REFERENCES admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fee_payments_student_fee ON fee_payments(student_fee_id);

-- =====================================================
-- 15. TIMETABLE TABLE
-- =====================================================
CREATE TABLE timetable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department VARCHAR(100),
    semester INT,
    section VARCHAR(10),
    day_of_week VARCHAR(20) CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    period_no INT,
    start_time TIME,
    end_time TIME,
    subject_id UUID REFERENCES subjects(id),
    room_no VARCHAR(20),
    faculty_name VARCHAR(255),
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department, semester, section, day_of_week, period_no)
);

CREATE INDEX idx_timetable_dept_sem_sec ON timetable(department, semester, section);

-- =====================================================
-- 16. LEAVE REQUESTS TABLE
-- =====================================================
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    request_type VARCHAR(20) CHECK (request_type IN ('Leave', 'OD')) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT NOT NULL,
    supporting_document_url TEXT,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
    reviewed_by UUID REFERENCES admins(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leave_requests_student ON leave_requests(student_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

-- =====================================================
-- 17. CERTIFICATE REQUESTS TABLE
-- =====================================================
CREATE TABLE certificate_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    certificate_type VARCHAR(100) NOT NULL,
    purpose TEXT,
    quantity INT DEFAULT 1,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Processing', 'Ready', 'Issued', 'Rejected')) DEFAULT 'Pending',
    processed_by UUID REFERENCES admins(id),
    issued_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certificate_requests_student ON certificate_requests(student_id);
CREATE INDEX idx_certificate_requests_status ON certificate_requests(status);

-- =====================================================
-- 18. FEEDBACK FORMS TABLE
-- =====================================================
CREATE TABLE feedback_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 19. FEEDBACK RESPONSES TABLE
-- =====================================================
CREATE TABLE feedback_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES feedback_forms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    response_data JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(form_id, student_id)
);

CREATE INDEX idx_feedback_responses_form ON feedback_responses(form_id);

-- =====================================================
-- 20. MESSAGES/ANNOUNCEMENTS TABLE
-- =====================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES admins(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) CHECK (message_type IN ('General', 'Academic', 'Event', 'Alert', 'Fee')) DEFAULT 'General',
    priority VARCHAR(20) CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')) DEFAULT 'Normal',
    target_type VARCHAR(20) CHECK (target_type IN ('All', 'Department', 'Batch', 'Semester', 'Individual')) NOT NULL,
    target_filter JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_messages_target_type ON messages(target_type);

-- =====================================================
-- 21. MESSAGE READS TABLE
-- =====================================================
CREATE TABLE message_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, student_id)
);

CREATE INDEX idx_message_reads_message ON message_reads(message_id);

-- =====================================================
-- 22. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- =====================================================
-- 23. ACTIVITY LOGS TABLE
-- =====================================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- =====================================================
-- ✅ SCHEMA CREATION COMPLETE!
-- Next: Run the RLS policies script
-- =====================================================
