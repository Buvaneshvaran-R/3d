-- =====================================================
-- RIT STUDENT PORTAL - ADMIN AUTO-CREATION TRIGGER
-- Run this to enable admin signup functionality
-- =====================================================

-- This trigger automatically creates an admin record when someone
-- signs up with an email domain @rit.edu or specific pattern

-- =====================================================
-- CREATE FUNCTION TO HANDLE NEW USER SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email contains 'admin' anywhere in the email address
  IF NEW.email ILIKE '%admin%' THEN
    -- Create admin record
    INSERT INTO public.admins (user_id, name, email, designation, department)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Admin Officer'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'designation', 'Academic Officer'),
      COALESCE(NEW.raw_user_meta_data->>'department', 'Administration')
    );
  ELSE
    -- Create student record
    -- Extract name from metadata or use email prefix
    INSERT INTO public.students (
      user_id, 
      register_no, 
      name, 
      email,
      department,
      semester,
      batch,
      section,
      current_year
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

-- =====================================================
-- CREATE TRIGGER ON AUTH.USERS
-- =====================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- ✅ ADMIN AUTO-CREATION ENABLED!
-- =====================================================

-- HOW IT WORKS:
-- 1. User signs up with email like admin@rit.edu or test@admin.rit.edu
--    → Automatically becomes ADMIN
-- 2. User signs up with any other email (e.g., student@rit.edu)
--    → Automatically becomes STUDENT
-- 3. Admin can immediately manage all student data
-- 4. Students can only see their own data (RLS policies)

-- TESTING:
-- Sign up with: admin@rit.edu → Creates Admin
-- Sign up with: john@student.rit.edu → Creates Student
