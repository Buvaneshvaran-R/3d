# Notifications System Setup Guide

## Overview
This implements a complete notification system where:
- Students can send requests to admin
- Admin receives notifications in real-time
- Admin can respond and update request status
- Students receive response notifications

## Database Setup

### Step 1: Run the SQL Migration
Execute the notification system SQL file in your Supabase SQL editor:

```bash
# File: supabase/14_notifications_system.sql
```

This will create:
- `notifications` table
- Row Level Security policies
- Real-time subscription setup
- Proper indexes for performance

### Step 2: Verify Table Creation
In Supabase Dashboard → Table Editor, you should see:
- `notifications` table with columns:
  - id (UUID)
  - sender_id (UUID, references students)
  - recipient_id (UUID)
  - recipient_type (VARCHAR - 'admin' or 'student')
  - subject (VARCHAR)
  - message (TEXT)
  - request_type (VARCHAR)
  - status (VARCHAR - 'pending', 'resolved', 'rejected')
  - is_read (BOOLEAN)
  - parent_notification_id (UUID)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)

## Features Implemented

### 1. Subject Registration Fix ✓
**Problem**: Subject options were empty in marks editors after registration  
**Solution**: Added `semester` and `academic_year` fields when inserting into `student_subjects` table  
**Files Changed**:
- `src/pages/SubjectRegistration.tsx` - Lines 108-119

### 2. Login Role Validation ✓
**Problem**: Admin credentials could login as student (and vice versa)  
**Solution**: Added role type validation in login function that checks user's actual role against selected role  
**Files Changed**:
- `src/contexts/AuthContext.tsx` - Updated `login()` function to accept and validate `roleType`
- `src/pages/Login.tsx` - Pass role type based on login route (`/admin-login` vs `/login`)

**How it works**:
- User selects "Login as Admin" → System checks if they're actually an admin
- User selects "Login as Student" → System checks if they're actually a student
- Mismatch = logout and show error message

### 3. Notification System ✓
**Components Created**:
1. **NotificationIcon** (`src/components/NotificationIcon.tsx`)
   - Bell icon with unread count badge
   - Dropdown showing recent notifications
   - Real-time updates via Supabase subscription
   - Click to navigate to Messages page

2. **Messages Page** (`src/pages/Messages.tsx`)
   - **Student View**:
     - Send Request tab: Create new requests with types (Leave, OD, Certificate, etc.)
     - Inbox tab: View admin responses and status updates
   - **Admin View**:
     - Inbox tab: View all student requests
     - Respond to requests with status (Resolved/Rejected)
     - See sender names for context

3. **DashboardLayout Integration** (`src/components/layout/DashboardLayout.tsx`)
   - Replaced old localStorage-based notifications
   - Added NotificationIcon component to header

## Usage

### For Students:
1. Navigate to Messages page
2. Click "Send Request" tab
3. Select request type (Leave, OD, Certificate, Academic, etc.)
4. Fill subject and message
5. Click "Send Request"
6. Check notification bell icon for admin responses
7. View responses in Inbox tab

### For Admins:
1. Check notification bell icon for student requests
2. Navigate to Messages page
3. Click on a request to view details
4. Select response status (Resolved/Rejected)
5. Type response message
6. Click "Send Response"
7. Student automatically receives notification

## Real-time Features
- Notifications update every 5-10 seconds
- Supabase real-time subscriptions for instant updates
- Unread badge shows count of unread messages
- Status badges: Pending (yellow), Resolved (green), Rejected (red)

## Testing

### Test Subject Registration:
1. Login as admin
2. Select a student
3. Go to Subject Registration
4. Add subjects (ensure they save to database)
5. Go to CAT/Lab/Assignment Marks pages
6. Verify subjects appear in dropdown ✓

### Test Login Role Validation:
1. Try admin credentials with "Login as Student" → Should fail ✓
2. Try student credentials with "Login as Admin" → Should fail ✓
3. Use correct role for credentials → Should succeed ✓

### Test Notification System:
1. **Student Side**:
   - Login as student
   - Go to Messages → Send Request
   - Create a request
   - Check if it appears in Inbox
   
2. **Admin Side**:
   - Login as admin
   - Check notification bell (should have badge)
   - Go to Messages
   - See student request
   - Send response
   
3. **Back to Student**:
   - Check notification bell (should have badge)
   - Go to Messages → Inbox
   - See admin response ✓

## Database Queries (Optional)

### View all notifications:
```sql
SELECT * FROM notifications ORDER BY created_at DESC;
```

### View pending student requests:
```sql
SELECT 
  n.*,
  s.name as student_name
FROM notifications n
JOIN students s ON s.id = n.sender_id
WHERE n.recipient_type = 'admin' 
  AND n.status = 'pending'
ORDER BY n.created_at DESC;
```

### Count unread by student:
```sql
SELECT 
  recipient_id,
  COUNT(*) as unread_count
FROM notifications
WHERE recipient_type = 'student' 
  AND is_read = false
GROUP BY recipient_id;
```

## Troubleshooting

### Subjects not showing in dropdown?
- Check if student_subjects has the registrations
- Verify semester and academic_year fields are not null
- Check browser console for API errors

### Login role validation not working?
- Verify user exists in both `users` and `admins`/`students` tables
- Check AuthContext is properly fetching role
- Look for error messages in toast notifications

### Notifications not appearing?
- Verify notifications table exists in Supabase
- Check RLS policies are enabled
- Ensure real-time is enabled on notifications table
- Check browser console for subscription errors

## Security Notes
- RLS policies ensure students only see their own notifications
- Admins can only see notifications sent to admin
- Students can only send to admin (not to other students)
- Admins can respond to any request
- All database operations are validated by Supabase RLS

## Next Steps (Optional Enhancements)
- Add notification categories/filters
- Add search functionality
- Add bulk actions for admin
- Add email notifications
- Add notification preferences
- Add read receipts
- Add attachment support
