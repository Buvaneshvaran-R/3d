-- =====================================================
-- FIX ADMIN RECORDS - Convert Students to Admins
-- Run this to fix users who should be admins
-- =====================================================

-- Fix chanuadmin@rit.edu
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get user_id for chanuadmin@rit.edu
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'chanuadmin@rit.edu';
  
  IF admin_user_id IS NOT NULL THEN
    -- Delete from students table
    DELETE FROM students WHERE user_id = admin_user_id;
    
    -- Check if admin record already exists
    IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = admin_user_id) THEN
      -- Insert into admins table
      INSERT INTO admins (user_id, name, email, phone, designation, department)
      VALUES (
        admin_user_id,
        'Chanu Admin',
        'chanuadmin@rit.edu',
        '9876543210',
        'Administrator',
        'Administration'
      );
      RAISE NOTICE 'Admin record created for chanuadmin@rit.edu';
    ELSE
      RAISE NOTICE 'Admin record already exists for chanuadmin@rit.edu';
    END IF;
  ELSE
    RAISE NOTICE 'User chanuadmin@rit.edu not found';
  END IF;
END $$;

-- Fix amuadmin@rit.edu
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get user_id for amuadmin@rit.edu
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'amuadmin@rit.edu';
  
  IF admin_user_id IS NOT NULL THEN
    -- Delete from students table
    DELETE FROM students WHERE user_id = admin_user_id;
    
    -- Check if admin record already exists
    IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = admin_user_id) THEN
      -- Insert into admins table
      INSERT INTO admins (user_id, name, email, phone, designation, department)
      VALUES (
        admin_user_id,
        'Amudlesh',
        'amuadmin@rit.edu',
        '9876543211',
        'Administrator',
        'Administration'
      );
      RAISE NOTICE 'Admin record created for amuadmin@rit.edu';
    ELSE
      RAISE NOTICE 'Admin record already exists for amuadmin@rit.edu';
    END IF;
  ELSE
    RAISE NOTICE 'User amuadmin@rit.edu not found';
  END IF;
END $$;

-- Verify the fix
SELECT 'ADMINS' as table_name, email, name FROM admins WHERE email LIKE '%admin%'
UNION ALL
SELECT 'STUDENTS' as table_name, email, name FROM students WHERE email LIKE '%admin%';

-- =====================================================
-- ✅ DONE! 
-- Now logout and login again with admin email
-- =====================================================
