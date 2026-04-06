# 🚀 RIT Student Portal - Complete Setup Guide

## ✅ Database Setup Complete!

All 23 tables created successfully. Now enable real-time authentication:

---

## 📋 Step 1: Execute Remaining SQL Files

Go to **Supabase Dashboard → SQL Editor** and run these files **in order**:

### 1️⃣ Enable Real-Time (REQUIRED)
**File:** `03_enable_realtime.sql`
```sql
-- Enables live updates for attendance, marks, messages, etc.
```

### 2️⃣ Auto-Create Admin/Student on Signup (REQUIRED)
**File:** `05_admin_signup_trigger.sql`
```sql
-- Automatically creates admin or student record when user signs up
-- Email pattern detection:
--   - admin@rit.edu or admin.* → Creates Admin
--   - Any other email → Creates Student
```

### 3️⃣ Signup Helper Functions (REQUIRED)
**File:** `06_signup_functions.sql`
```sql
-- Additional validation and helper functions
```

### 4️⃣ Sample Data (OPTIONAL - For Testing Only)
**File:** `04_sample_data.sql`
```sql
-- Creates test subjects, timetable, fee structures
-- Skip steps 1-2-13 (admin/student inserts)
-- Just run sections 3-12 for sample data
```

---

## 🔐 Step 2: Configure Supabase Authentication

### A. Disable Email Confirmation (For Development)

1. Go to **Supabase Dashboard → Authentication → Settings**
2. Scroll to **Email Auth**
3. **Disable** "Enable email confirmations"
4. Click **Save**

### B. Get Your Supabase Keys

1. Go to **Supabase Dashboard → Settings → API**
2. Copy:
   - **Project URL** (e.g., `https://xyz.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

---

## ⚙️ Step 3: Configure Frontend

### Update Supabase Configuration

Edit `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'     // Paste your URL here
const supabaseAnonKey = 'YOUR_ANON_KEY'     // Paste your anon key here

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 🎯 Step 4: Test Real-Time Signup & Login

### 1. Start Development Server
```bash
npm run dev
```

### 2. Create Admin Account
1. Navigate to `http://localhost:5173/signup`
2. Click "**Admin Signup**" tab
3. Fill in details:
   - **Email:** `admin@rit.edu` ⚠️ Must contain "admin"
   - **Password:** Your choice (min. 6 chars)
   - **Name:** Dr. Admin Officer
   - **Designation:** Academic Coordinator
   - **Phone:** 9876543210
4. Click "**Create Account**"
5. ✅ Admin record automatically created in database!

### 3. Create Student Account
1. Navigate to `http://localhost:5173/signup`
2. Stay on "**Student Signup**" tab
3. Fill in all student details:
   - **Email:** `student@rit.edu` or any email
   - **Password:** Your choice
   - **Register No:** `2022CS001`
   - **Department:** Computer Science and Engineering
   - **Semester:** 5
   - **Batch:** 2022-2026
   - **Section:** A
   - **Current Year:** 3
   - etc.
4. Click "**Create Account**"
5. ✅ Student record automatically created in database!

### 4. Login
1. Navigate to `http://localhost:5173/login`
2. Use the credentials you just created
3. ✅ You're in!

---

## 🔄 How Auto-Creation Works

### Email Pattern Detection

The trigger automatically detects user type based on email:

#### **Admin Detection:**
- ✅ `admin@rit.edu`
- ✅ `admin.john@rit.edu`
- ✅ `test@admin.rit.edu`
- ✅ Any email with "admin" pattern

#### **Student Detection:**
- ✅ `student@rit.edu`
- ✅ `john.doe@rit.edu`
- ✅ Any other email pattern

### Signup Flow

```
User Signs Up
    ↓
Auth.users record created
    ↓
Trigger detects email pattern
    ↓
┌─────────────────┬──────────────────┐
│ admin@rit.edu   │ student@rit.edu  │
│       ↓         │        ↓         │
│ Creates Admin   │ Creates Student  │
│ in admins table │ in students table│
└─────────────────┴──────────────────┘
    ↓
RLS Policies Applied
    ↓
User can login!
```

---

## 📊 Verify Setup

Run these queries in **Supabase SQL Editor**:

```sql
-- Check if admin was created
SELECT * FROM admins WHERE email = 'admin@rit.edu';

-- Check if student was created
SELECT * FROM students WHERE email = 'student@rit.edu';

-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check real-time is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

---

## 🎨 Features Now Available

### For Students:
- ✅ Sign up with email & student details
- ✅ Login to personalized dashboard
- ✅ View attendance, marks, fees
- ✅ Request leave/certificates
- ✅ Real-time notifications

### For Admins:
- ✅ Sign up with admin email
- ✅ Login to admin dashboard
- ✅ Manage student data
- ✅ Mark attendance
- ✅ Enter marks & grades
- ✅ Send messages to students

---

## 🔒 Security Features

### Row Level Security (RLS)
- ✅ Students see only their own data
- ✅ Admins see all student data
- ✅ Database-level security (can't be bypassed)

### Real-Time Updates
- ✅ Admin marks attendance → Student sees instantly
- ✅ Admin posts message → Student notification appears
- ✅ No page refresh needed

---

## 🐛 Troubleshooting

### Issue: "Policy violation" error
**Solution:** Make sure you ran `02_rls_policies.sql`

### Issue: User created but no admin/student record
**Solution:** 
1. Check if `05_admin_signup_trigger.sql` was executed
2. Verify email pattern (admin emails must contain "admin")
3. Check Supabase logs for trigger errors

### Issue: Can't login after signup
**Solution:** 
1. Check if email confirmation is disabled
2. Or manually confirm user in Dashboard → Authentication → Users

### Issue: Real-time updates not working
**Solution:** Make sure you ran `03_enable_realtime.sql`

---

## 🎯 Next Steps

1. ✅ Run remaining SQL files (03, 05, 06)
2. ✅ Configure Supabase keys in frontend
3. ✅ Test signup flow (admin + student)
4. ✅ Test login and dashboard access
5. ✅ Test real-time features
6. 🚀 Start building your app features!

---

## 📞 Need Help?

- Check Supabase logs: **Dashboard → Database → Logs**
- Check browser console for errors
- Verify API keys are correct
- Ensure all SQL files were executed in order

---

**🎉 You're all set! Start building your student portal!**
