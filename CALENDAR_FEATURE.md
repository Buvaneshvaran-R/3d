# Academic Calendar Feature - Admin Editable

## Overview
The Academic Calendar has been upgraded to support admin editing with real-time updates for all users (both admins and students). When an admin makes changes to the calendar, those changes are immediately visible to all students viewing the calendar.

## Features

### For Students:
- View the complete academic calendar with all events, holidays, CAT dates, assignments, etc.
- See leave statistics (working days, taken leaves, available leaves)
- Real-time updates when admins make changes to the calendar
- Interactive calendar navigation by month
- Hover tooltips showing detailed event information

### For Admins:
- All student features PLUS:
- Click any day to edit its details
- Change day type (working, holiday, CAT, club day, etc.)
- Add/edit event names
- Set assignments and units
- Update cumulative day counts
- Changes sync immediately to all users via real-time subscriptions

## Database Schema

The calendar data is stored in the `academic_calendar` table:

```sql
academic_calendar
├── id (UUID, primary key)
├── month_name (VARCHAR) - JANUARY, FEBRUARY, etc.
├── year (INTEGER) - 2026
├── date_number (INTEGER) - 1-31
├── start_day (INTEGER) - 0=Sunday, 1=Monday, etc.
├── day_type (VARCHAR) - working, holiday, cat, club, etc.
├── event_name (VARCHAR) - Optional event description
├── cumulative_days (INTEGER) - Running total of working days
├── assignment (VARCHAR) - Optional assignment info
├── unit (VARCHAR) - Optional unit/topic info
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── updated_by (UUID) - Admin who made last change
```

## Setup Instructions

### 1. Run Database Migrations

Execute the SQL files in order:

```bash
# In Supabase SQL Editor, run these files:
1. supabase/11_academic_calendar.sql   # Creates the table and policies
2. supabase/12_calendar_seed_data.sql  # Populates with initial data
```

### 2. Verify Real-time is Enabled

The migration automatically enables real-time for the academic_calendar table. Verify in Supabase Dashboard:
- Database → Replication → Check that `academic_calendar` is listed

### 3. Test the Feature

**As Admin:**
1. Log in as an admin user
2. Navigate to Dashboard
3. Look for "Admin Mode - Click to Edit" badge on the calendar
4. Click any day on the calendar
5. Edit dialog appears - modify day type, event, assignment, etc.
6. Click "Save Changes"
7. Changes appear immediately

**As Student:**
1. Log in as a student user
2. Navigate to Dashboard  
3. View the calendar (no edit functionality)
4. Have an admin make a change while you're viewing
5. Watch the calendar update in real-time (no refresh needed)

## Security

Row Level Security (RLS) policies ensure:
- ✅ All authenticated users can READ calendar data
- ✅ Only admins can INSERT/UPDATE/DELETE calendar data
- ✅ Changes are tracked (updated_by, updated_at)

## Day Types

Available day types with color coding:
- **Working** - White/slate (normal classes)
- **Holiday** - Pink (holidays and breaks)
- **Weekend** - Dark slate (Saturday/Sunday)
- **Reopening** - Emerald (semester start)
- **CCM** - Sky blue (Class Committee Meeting)
- **GC** - Teal (Governing Council)
- **CAT** - Rose (Continuous Assessment Test)
- **Club** - Amber (Club activities)
- **Feedback** - Lime (Feedback sessions)
- **LWD** - Indigo (Last Working Day)
- **Practical** - Cyan (Practical exams)
- **Theory** - Purple (Theory exams)

## Real-time Technology

The calendar uses Supabase Real-time subscriptions:
- Changes to `academic_calendar` table trigger real-time events
- All connected clients receive updates instantly
- No polling or manual refresh required
- Efficient: only changed records are transmitted

## Customization

### Adding More Months
To add more months to the calendar:

1. Insert data into `academic_calendar` table:
```sql
INSERT INTO academic_calendar (month_name, year, date_number, start_day, day_type, event_name, cumulative_days)
VALUES ('JUNE', 2026, 1, 0, 'working', NULL, 80);
```

2. The calendar component automatically groups and displays all months

### Changing Academic Year
Update the calendar header in `AcademicCalendar.tsx`:
```tsx
Academic Calendar 2025-26 (Even Semester)
```

## Troubleshooting

### Calendar not loading?
- Check browser console for errors
- Verify database migrations ran successfully
- Ensure user is authenticated

### Admin can't edit?
- Verify user role is 'admin' in `users` table
- Check RLS policies are enabled
- Look for policy errors in browser console

### Changes not appearing in real-time?
- Verify real-time is enabled for `academic_calendar` table
- Check network tab for subscription errors
- Ensure both users are authenticated and connected

## Future Enhancements

Potential improvements:
- [ ] Bulk edit multiple days
- [ ] Import/export calendar data (CSV/Excel)
- [ ] Calendar templates for different departments
- [ ] Email notifications when important dates are changed
- [ ] Audit log showing history of calendar changes
- [ ] Add notes/comments to specific days
- [ ] Integration with Leave/OD system to auto-calculate taken leaves

## Files Modified

1. `src/components/AcademicCalendar.tsx` - Complete rewrite with database integration and admin editing
2. `src/pages/Dashboard.tsx` - Added calendar to admin dashboard (above Recent Activity)
3. `supabase/11_academic_calendar.sql` - Database schema and RLS policies
4. `supabase/12_calendar_seed_data.sql` - Initial calendar data for 2026

## Technical Notes

- Component uses React hooks (useState, useEffect)
- Real-time subscription cleanup on unmount prevents memory leaks
- Optimistic UI updates for better UX (immediate feedback)
- Toast notifications for success/error feedback
- Dialog component from shadcn/ui for modal editing
- Type-safe with TypeScript interfaces
