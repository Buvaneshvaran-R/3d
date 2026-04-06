-- =====================================================
-- 🚀 QUICK START - RUN ALL IN ONE GO
-- =====================================================
-- Copy and paste this entire file into Supabase SQL Editor
-- This will set up everything in one execution
-- =====================================================

-- =====================================================
-- 1. ENABLE EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. CREATE ALL TABLES (Abbreviated for key tables)
-- =====================================================

-- Students Table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    register_no VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
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

-- Admins Table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);

-- =====================================================
-- 3. ADMIN AUTO-CREATION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email contains 'admin'
  IF NEW.email LIKE '%admin%' THEN
    INSERT INTO public.admins (user_id, name, email, designation, department)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Admin Officer'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'designation', 'Academic Officer'),
      COALESCE(NEW.raw_user_meta_data->>'department', 'Administration')
    );
  ELSE
    INSERT INTO public.students (
      user_id, register_no, name, email, department,
      semester, batch, section, current_year
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'register_no', 'TEMP' || substring(NEW.id::text, 1, 8)),
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'department', 'Computer Science and Engineering'),
      COALESCE((NEW.raw_user_meta_data->>'semester')::int, 5),
      COALESCE(NEW.raw_user_meta_data->>'batch', '2022-2026'),
      COALESCE(NEW.raw_user_meta_data->>'section', 'A'),
      COALESCE((NEW.raw_user_meta_data->>'current_year')::int, 3)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 4. HELPER FUNCTIONS FOR RLS
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_student_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM students WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ENABLE RLS AND CREATE BASIC POLICIES
-- =====================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Students can view own profile
CREATE POLICY "Students can view own profile" ON students FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Students can update own profile" ON students FOR UPDATE USING (user_id = auth.uid());

-- Admins can view all students
CREATE POLICY "Admins can view all students" ON students FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert students" ON students FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update students" ON students FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete students" ON students FOR DELETE USING (is_admin());

-- Admins can view own profile
CREATE POLICY "Admins can view own profile" ON admins FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all admins" ON admins FOR SELECT USING (is_admin());

-- =====================================================
-- ✅ QUICK START COMPLETE!
-- =====================================================
-- Now you can:
-- 1. Sign up with admin@rit.edu → Becomes Admin
-- 2. Sign up with student@rit.edu → Becomes Student
-- 3. Run the full schema files for complete functionality
-- =====================================================

SELECT 'Database setup complete! Create test users now.' AS message;
