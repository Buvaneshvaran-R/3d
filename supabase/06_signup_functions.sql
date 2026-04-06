-- =====================================================
-- RIT STUDENT PORTAL - SIGNUP FUNCTION FOR FRONTEND
-- Use this function from frontend for controlled signup
-- =====================================================

-- This function allows controlled user registration with role assignment

CREATE OR REPLACE FUNCTION signup_user(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'student',
  p_register_no TEXT DEFAULT NULL,
  p_department TEXT DEFAULT 'Computer Science and Engineering',
  p_semester INT DEFAULT 5,
  p_batch TEXT DEFAULT '2022-2026',
  p_section TEXT DEFAULT 'A',
  p_designation TEXT DEFAULT 'Academic Officer'
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Validate role
  IF p_role NOT IN ('admin', 'student') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role. Must be admin or student');
  END IF;

  -- Note: Actual user creation happens via Supabase Auth API
  -- This function is just for metadata validation
  
  IF p_role = 'admin' THEN
    -- Validate admin email (must contain 'admin')
    IF p_email NOT LIKE '%admin%' THEN
      RETURN json_build_object('success', false, 'error', 'Admin email must contain "admin"');
    END IF;
    
    RETURN json_build_object(
      'success', true, 
      'message', 'Admin signup validated. Use Supabase Auth to create user.',
      'metadata', json_build_object(
        'name', p_name,
        'role', 'admin',
        'designation', p_designation
      )
    );
  ELSE
    -- Validate student data
    IF p_register_no IS NULL OR p_register_no = '' THEN
      RETURN json_build_object('success', false, 'error', 'Register number is required for students');
    END IF;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Student signup validated. Use Supabase Auth to create user.',
      'metadata', json_build_object(
        'name', p_name,
        'role', 'student',
        'register_no', p_register_no,
        'department', p_department,
        'semester', p_semester,
        'batch', p_batch,
        'section', p_section
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ALTERNATIVE: MANUAL ADMIN/STUDENT CREATION
-- =====================================================

-- Function to manually create admin (for super admin use)
CREATE OR REPLACE FUNCTION create_admin_manually(
  p_user_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_designation TEXT DEFAULT 'Academic Officer',
  p_department TEXT DEFAULT 'Administration'
)
RETURNS JSON AS $$
BEGIN
  INSERT INTO public.admins (user_id, name, email, designation, department)
  VALUES (p_user_id, p_name, p_email, p_designation, p_department);
  
  RETURN json_build_object('success', true, 'message', 'Admin created successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually create student (for admin use)
CREATE OR REPLACE FUNCTION create_student_manually(
  p_user_id UUID,
  p_register_no TEXT,
  p_name TEXT,
  p_email TEXT,
  p_department TEXT DEFAULT 'Computer Science and Engineering',
  p_semester INT DEFAULT 5,
  p_batch TEXT DEFAULT '2022-2026',
  p_section TEXT DEFAULT 'A',
  p_current_year INT DEFAULT 3
)
RETURNS JSON AS $$
BEGIN
  INSERT INTO public.students (
    user_id, register_no, name, email, department, 
    semester, batch, section, current_year
  )
  VALUES (
    p_user_id, p_register_no, p_name, p_email, p_department,
    p_semester, p_batch, p_section, p_current_year
  );
  
  RETURN json_build_object('success', true, 'message', 'Student created successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ✅ SIGNUP FUNCTIONS READY!
-- =====================================================

-- USAGE FROM FRONTEND:
/*

// For Admin Signup (use Supabase Auth)
const { data, error } = await supabase.auth.signUp({
  email: 'admin@rit.edu',
  password: 'password123',
  options: {
    data: {
      name: 'Dr. Admin Officer',
      role: 'admin',
      designation: 'Academic Coordinator'
    }
  }
});

// For Student Signup (use Supabase Auth)
const { data, error } = await supabase.auth.signUp({
  email: 'student@rit.edu',
  password: 'password123',
  options: {
    data: {
      name: 'John Doe',
      role: 'student',
      register_no: '2022CS001',
      department: 'Computer Science and Engineering',
      semester: 5,
      batch: '2022-2026',
      section: 'A',
      current_year: 3
    }
  }
});

*/
