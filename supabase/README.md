# 🗄️ SUPABASE DATABASE SETUP GUIDE

## 📋 Execute SQL Files in This Order

Run these SQL files in your Supabase SQL Editor **in the exact order listed below**.

Go to: **Supabase Dashboard** → **SQL Editor** → **New Query**

---

## ✅ STEP-BY-STEP EXECUTION

### **1. Create Database Schema** 
**File:** `01_schema.sql`

- Creates all 23 tables
- Sets up relationships
- Creates indexes for performance
- Estimated time: 10 seconds

**What it does:**
- Students, Admins tables
- Subjects, Attendance, Marks tables
- Fee management tables
- Messages, Notifications tables
- Activity logs

---

### **2. Set Up Row Level Security (RLS)**
**File:** `02_rls_policies.sql`

- Enables RLS on all tables
- Creates security policies
- Students see only their data
- Admins see all data
- Estimated time: 15 seconds

**What it does:**
- Students can view own attendance, marks, fees
- Admins can manage all data
- Database-level security (can't be bypassed)

---

### **3. Enable Real-Time Subscriptions**
**File:** `03_enable_realtime.sql`

- Enables real-time on all critical tables
- Admin updates → Student sees instantly

---

### **4. Add Sample Data (Optional)**
**File:** `04_sample_data.sql`

- Sample students and admins
- Test marks, attendance
- Demo timetables
- Estimated time: 5 seconds

---

### **5. Setup Admin Signup Trigger**
**File:** `05_admin_signup_trigger.sql`

- Auto-creates admin record on signup
- Links auth.users to admins table
- Handles metadata properly

---

### **6. Create Signup Functions**
**File:** `06_signup_functions.sql`

- Student signup function
- Admin signup function
- Proper error handling

---

### **7. Add Personal & Academic Information Fields** ⭐ **NEW**
**File:** `07_add_personal_academic_fields.sql`

- Adds 10 new fields to students table:
  - Date of Joining
  - Branch/Specialization
  - Permanent Address
  - Communication Address
  - Father Name, Mother Name
  - Guardian Name, Guardian Phone
  - Credits Earned, Backlogs
- Creates indexes for performance
- Adds update triggers
- Estimated time: 5 seconds

**What it enables:**
- Complete student profile management
- Admin can edit all personal information
- Real-time sync between admin and student views
- Academic progress tracking

---

### **8. Sample Data and Testing Queries** (Optional)
**File:** `sample_data_and_testing.sql`

- Sample INSERT statements
- Testing queries for new fields
- Validation queries
- Performance checks
- Statistics queries

**Use for:**
- Testing the new personal info fields
- Populating sample data
- Validating data integrity
- Performance monitoring

---
- Student submits → Admin sees instantly
- Estimated time: 5 seconds

**What it does:**
- Attendance updates broadcast live
- Marks updates broadcast live
- Messages broadcast live
- Notifications broadcast live

---

### **4. Admin Auto-Creation Trigger** ⭐
**File:** `05_admin_signup_trigger.sql`

- Automatically creates admin/student records on signup
- Email pattern detection (admin@rit.edu = Admin)
- Metadata-based role assignment
- Estimated time: 5 seconds

**What it does:**
- Signup with `admin@rit.edu` → Creates Admin
- Signup with `student@rit.edu` → Creates Student
- Automatic profile creation
- No manual database entry needed

---

### **5. Signup Helper Functions**
**File:** `06_signup_functions.sql`

- Validation functions
- Manual user creation functions
- Metadata helpers
- Estimated time: 5 seconds

**What it does:**
- Validate signup data
- Manual admin/student creation
- Bulk user import support

---

### **6. Sample Test Data** (Optional)
**File:** `04_sample_data.sql`

⚠️ **ONLY FOR TESTING!** Skip in production.

- Creates 1 admin, 3 students
- 6 subjects with registrations
- Sample attendance, marks, fees
- Estimated time: 10 seconds

**Before running:**
1. Create test users in Supabase Auth Dashboard
2. Copy their UUIDs
3. Replace placeholders in the file
4. Then execute

---

## 🔐 CREATE TEST USERS

After running SQL scripts, create users in Supabase:

### **Supabase Dashboard** → **Authentication** → **Add User**

**Create Admin:**
```
Email: admin@rit.edu
Password: admin123456
Auto Confirm: Yes
```

**Create Student:**
```
Email: student@rit.edu
Password: student123456
Auto Confirm: Yes
```

---

## 🧪 VERIFY SETUP

Run these queries in SQL Editor to verify:

```sql
-- Check if admin was created
SELECT * FROM admins WHERE email = 'admin@rit.edu';

-- Check if student was created
SELECT * FROM students WHERE email = 'student@rit.edu';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check real-time is enabled
SELECT schemaname, tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

---

## 🚀 HOW ADMIN SIGNUP WORKS

### **Automatic Role Detection:**

**Admin Pattern (any of these):**
- `admin@rit.edu` ✅
- `admin.john@rit.edu` ✅
- `test@admin.rit.edu` ✅
- Any email with "admin" in domain

**Student Pattern:**
- `student@rit.edu` ✅
- `john.doe@rit.edu` ✅
- Any other email pattern

### **Signup Flow:**

```typescript
// Frontend code (already in Login.tsx)
const { data, error } = await supabase.auth.signUp({
  email: 'admin@rit.edu', // Email determines role
  password: 'password123',
  options: {
    data: {
      name: 'Dr. Admin Officer',
      designation: 'Academic Coordinator'
    }
  }
});

// Trigger automatically:
// 1. Creates user in auth.users
// 2. Detects email pattern
// 3. Creates admin record in public.admins
// 4. Sets up RLS permissions
```

---

## 📡 REAL-TIME FEATURES

After setup, your app will have:

### **Admin → Student Updates:**
- ✅ Admin marks attendance → Student sees instantly
- ✅ Admin enters marks → Student sees instantly
- ✅ Admin posts message → Student notification appears
- ✅ Admin updates fees → Student sees balance update

### **Student → Admin Updates:**
- ✅ Student requests leave → Admin notification appears
- ✅ Student requests certificate → Admin sees request
- ✅ Student submits feedback → Admin sees response

### **How to Use in Frontend:**

```typescript
// Already implemented in your components
useEffect(() => {
  const channel = supabase
    .channel('attendance-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance',
        filter: `student_id=eq.${studentId}`
      },
      (payload) => {
        console.log('Real-time update!', payload);
        // Refresh your data automatically
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [studentId]);
```

---

## ⚠️ IMPORTANT NOTES

### **Email Confirmation:**
By default, Supabase sends confirmation emails. For testing:
1. Go to **Authentication** → **Settings**
2. Disable "Enable email confirmations"
3. Or use "Auto Confirm User" when creating test users

### **RLS Policies:**
- **NEVER disable RLS** on production
- Policies enforce data access at database level
- Even if frontend is compromised, data is safe

### **Real-Time Quotas:**
- Free tier: 200 concurrent connections
- Sufficient for 100-200 active users
- Upgrade if you need more

---

## 🔧 TROUBLESHOOTING

### **Admin not created after signup?**
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Manually create admin
SELECT create_admin_manually(
  'user-uuid-here',
  'Admin Name',
  'admin@rit.edu',
  'Academic Coordinator',
  'Administration'
);
```

### **Student not created after signup?**
```sql
-- Manually create student
SELECT create_student_manually(
  'user-uuid-here',
  '2022CS001',
  'Student Name',
  'student@rit.edu',
  'Computer Science and Engineering',
  5,
  '2022-2026',
  'A',
  3
);
```

### **Real-time not working?**
```sql
-- Re-enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE cat_marks;
-- ... (run 03_enable_realtime.sql again)
```

---

## ✅ SUCCESS CHECKLIST

After running all scripts, verify:

- [ ] All 23 tables created
- [ ] RLS enabled on all tables
- [ ] Real-time enabled on critical tables
- [ ] Admin signup trigger working
- [ ] Test admin user created
- [ ] Test student user created
- [ ] Can login as admin
- [ ] Can login as student
- [ ] Admin sees all data
- [ ] Student sees only own data

---

## 🎯 NEXT STEPS

1. **Run SQL scripts 1-6 in order**
2. **Create test users in Auth Dashboard**
3. **Test login as admin** → Verify you can see "Admin Officer" role
4. **Test login as student** → Verify you see student data only
5. **Test real-time** → Mark attendance as admin, see update as student
6. **Deploy to production** → Repeat process on production Supabase

---

## 📞 PRODUCTION DEPLOYMENT

When ready for production:

1. Create new Supabase project (production)
2. Run scripts 1-6 (skip sample data)
3. Update `.env.local` with production credentials
4. Enable email confirmations
5. Set up custom domain
6. Configure rate limiting
7. Set up monitoring

---

**Need help?** Check the comments in each SQL file for detailed explanations!
