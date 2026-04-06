# Quick Setup Guide - Admin Editable Calendar

## Step 1: Run Database Migrations

Open your Supabase SQL Editor and execute these files in order:

### File 1: `supabase/11_academic_calendar.sql`
This creates the database table and security policies.

### File 2: `supabase/12_calendar_seed_data.sql`
This populates the calendar with initial data for January-May 2026.

## Step 2: Test the Feature

### As Admin:
1. Login with admin credentials
2. Go to Dashboard
3. Scroll to the Academic Calendar
4. You should see a badge: "Admin Mode - Click to Edit"
5. Click any date on the calendar
6. Edit dialog opens - change day type, add events, etc.
7. Save changes
8. Changes appear immediately!

### As Student:
1. Login with student credentials
2. Go to Dashboard
3. Scroll to the Academic Calendar
4. View the calendar (no edit capability)
5. If an admin makes changes, they appear in real-time!

## Step 3: Verify Real-time Works

1. Open two browser windows side-by-side
2. Login as admin in one, student in the other
3. Both navigate to Dashboard
4. Admin edits a calendar day
5. Student's calendar updates automatically (no refresh needed!)

## That's it! 🎉

The calendar is now:
- ✅ Visible to both admins and students
- ✅ Editable by admins only
- ✅ Updates in real-time for all users
- ✅ Secured with Row Level Security

## Troubleshooting

**Calendar showing default data?**
- Run the seed data script (12_calendar_seed_data.sql)

**Can't edit as admin?**
- Verify your role is 'admin' in the users table
- Check: `SELECT role FROM users WHERE id = '<your-user-id>'`

**Real-time not working?**
- Verify in Supabase Dashboard: Database → Replication
- Ensure `academic_calendar` table is enabled for real-time

## Next Steps

Check [CALENDAR_FEATURE.md](./CALENDAR_FEATURE.md) for:
- Detailed feature documentation
- Customization options
- Security details
- Future enhancements
