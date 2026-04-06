# System Architecture - Personal Information Feature

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN INTERFACE                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌────────────────────────┐   │
│  │ Student Selector │────────▶│  PersonalInfo Page     │   │
│  │                  │         │  (with Edit mode)      │   │
│  │ - Search by:     │         │                        │   │
│  │   • Register No  │         │ - Personal Details     │   │
│  │   • Name         │         │ - Parent/Guardian      │   │
│  │   • Department   │         │ - Academic Info        │   │
│  └──────────────────┘         │                        │   │
│         │                      │ [Edit Button]          │   │
│         │                      │ [Save Button]          │   │
│         ▼                      └────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐      │
│  │  AdminStudentManagement Page (NEW)              │      │
│  ├──────────────────────────────────────────────────┤      │
│  │  ┌────────────────┐                              │      │
│  │  │ StudentSelector│                              │      │
│  │  └────────────────┘                              │      │
│  │           │                                       │      │
│  │           ▼                                       │      │
│  │  ┌─────────────────────────────────────────┐    │      │
│  │  │    AdminStudentEditor Component         │    │      │
│  │  ├─────────────────────────────────────────┤    │      │
│  │  │ ┌─────────────────────────────────────┐ │    │      │
│  │  │ │  Basic Information Section          │ │    │      │
│  │  │ │  - Name, Register No, Email         │ │    │      │
│  │  │ │  - Phone, DOB, DOJ                  │ │    │      │
│  │  │ │  - Gender, Blood Group              │ │    │      │
│  │  │ └─────────────────────────────────────┘ │    │      │
│  │  │                                          │    │      │
│  │  │ ┌─────────────────────────────────────┐ │    │      │
│  │  │ │  Academic Information Section       │ │    │      │
│  │  │ │  - Department, Branch               │ │    │      │
│  │  │ │  - Year, Semester, Batch, Section   │ │    │      │
│  │  │ │  - Credits Earned, Backlogs         │ │    │      │
│  │  │ └─────────────────────────────────────┘ │    │      │
│  │  │                                          │    │      │
│  │  │ ┌─────────────────────────────────────┐ │    │      │
│  │  │ │  Address Information Section        │ │    │      │
│  │  │ │  - Permanent Address (textarea)     │ │    │      │
│  │  │ │  - Communication Address (textarea) │ │    │      │
│  │  │ └─────────────────────────────────────┘ │    │      │
│  │  │                                          │    │      │
│  │  │ ┌─────────────────────────────────────┐ │    │      │
│  │  │ │  Parent/Guardian Info Section       │ │    │      │
│  │  │ │  - Father Name, Mother Name         │ │    │      │
│  │  │ │  - Guardian Name, Guardian Phone    │ │    │      │
│  │  │ └─────────────────────────────────────┘ │    │      │
│  │  │                                          │    │      │
│  │  │           [Save Changes] [Cancel]        │    │      │
│  │  └─────────────────────────────────────────┘    │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    STUDENT INTERFACE                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │           PersonalInfo Page (Read-Only)            │     │
│  ├────────────────────────────────────────────────────┤     │
│  │                                                     │     │
│  │  ┌───────────────┐    ┌─────────────────────────┐ │     │
│  │  │ Profile Card  │    │  Personal Details Card  │ │     │
│  │  │               │    │  • Email, Phone         │ │     │
│  │  │ • Avatar      │    │  • DOB, DOJ             │ │     │
│  │  │ • Name        │    │  • Blood Group, Branch  │ │     │
│  │  │ • Reg No      │    │  • Addresses            │ │     │
│  │  │ • Department  │    └─────────────────────────┘ │     │
│  │  │ • Year/Sem    │                                 │     │
│  │  └───────────────┘    ┌─────────────────────────┐ │     │
│  │                        │  Parent/Guardian Card   │ │     │
│  │                        │  • Father Name          │ │     │
│  │                        │  • Mother Name          │ │     │
│  │                        │  • Guardian Info        │ │     │
│  │                        └─────────────────────────┘ │     │
│  │                                                     │     │
│  │                        ┌─────────────────────────┐ │     │
│  │                        │  Academic Info Card     │ │     │
│  │                        │  • Current Semester     │ │     │
│  │                        │  • Credits Earned       │ │     │
│  │                        │  • Backlogs             │ │     │
│  │                        └─────────────────────────┘ │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────┐
│   Admin UI   │
│ (Edit Form)  │
└──────┬───────┘
       │
       │ 1. Click "Save Changes"
       │    with updated data
       ▼
┌─────────────────────────────────────┐
│   Supabase Client (Frontend)        │
│   - Validates data                  │
│   - Calls .update() on students     │
└──────────┬──────────────────────────┘
           │
           │ 2. HTTP POST
           │    Authorization: Bearer <token>
           ▼
┌─────────────────────────────────────┐
│   Supabase Backend                  │
│   - Validates JWT token             │
│   - Checks RLS policies             │
│   - Verifies admin permissions      │
└──────────┬──────────────────────────┘
           │
           │ 3. SQL UPDATE if authorized
           ▼
┌─────────────────────────────────────┐
│   PostgreSQL Database               │
│   ┌───────────────────────────────┐ │
│   │   students table              │ │
│   ├───────────────────────────────┤ │
│   │ id, name, register_no...      │ │
│   │ father_name ← NEW             │ │
│   │ mother_name ← NEW             │ │
│   │ date_of_joining ← NEW         │ │
│   │ branch ← NEW                  │ │
│   │ permanent_address ← NEW       │ │
│   │ communication_address ← NEW   │ │
│   │ guardian_name ← NEW           │ │
│   │ guardian_phone ← NEW          │ │
│   │ credits_earned ← NEW          │ │
│   │ backlogs ← NEW                │ │
│   │ updated_at (auto-updated)     │ │
│   └───────────────────────────────┘ │
└──────────┬──────────────────────────┘
           │
           │ 4. Database triggers UPDATE event
           ▼
┌─────────────────────────────────────┐
│   Realtime Broadcast Channel        │
│   - Detects UPDATE on students      │
│   - Filters by student_id           │
│   - Broadcasts to subscribers       │
└──────┬────────────────────┬─────────┘
       │                    │
       │ 5a. Push update    │ 5b. Push update
       ▼                    ▼
┌──────────────┐    ┌──────────────┐
│  Admin UI    │    │  Student UI  │
│              │    │              │
│ ✓ Shows      │    │ ✓ Auto-      │
│   success    │    │   updates    │
│   toast      │    │   info       │
│              │    │              │
│ ✓ Data       │    │ ✓ No page    │
│   refreshed  │    │   refresh    │
└──────────────┘    └──────────────┘
```

## Real-time Subscription Flow

```
Student Opens PersonalInfo Page
         │
         ▼
┌────────────────────────────────────┐
│  useEffect hook runs               │
│  - Loads initial data              │
│  - Sets up realtime subscription   │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│  supabase.channel()                │
│  .on('postgres_changes', ...)     │
│  .subscribe()                      │
└────────┬───────────────────────────┘
         │
         │ WebSocket Connection
         ▼
┌────────────────────────────────────┐
│  Supabase Realtime Server          │
│  - Maintains WebSocket             │
│  - Listens to DB changes           │
│  - Filters by student_id           │
└────────┬───────────────────────────┘
         │
         │ Waiting for changes...
         │
         ▼ Admin updates data
┌────────────────────────────────────┐
│  Database UPDATE occurs            │
│  - students table modified         │
│  - Triggers realtime event         │
└────────┬───────────────────────────┘
         │
         │ Broadcast event
         ▼
┌────────────────────────────────────┐
│  Realtime Server                   │
│  - Receives DB event               │
│  - Checks active subscriptions     │
│  - Sends to matching clients       │
└────────┬───────────────────────────┘
         │
         │ Push to client
         ▼
┌────────────────────────────────────┐
│  Student Browser                   │
│  - Receives WebSocket message      │
│  - Triggers callback function      │
│  - Re-fetches student data         │
│  - Updates React state             │
│  - UI re-renders automatically     │
└────────────────────────────────────┘
         │
         ▼
    Updated UI! ✨
```

## Database Schema Relationship

```
┌──────────────────────────────────────────────────────────┐
│                     auth.users                            │
│  (Managed by Supabase Auth)                              │
├──────────────────────────────────────────────────────────┤
│  id (UUID) ← Primary Key                                 │
│  email                                                    │
│  encrypted_password                                       │
│  ...                                                      │
└────────┬──────────────────────────┬──────────────────────┘
         │                          │
         │ user_id FK               │ user_id FK
         │                          │
         ▼                          ▼
┌───────────────────┐      ┌──────────────────────────────┐
│     admins        │      │        students               │
├───────────────────┤      ├──────────────────────────────┤
│ id (UUID)         │      │ id (UUID)                    │
│ user_id (FK)      │      │ user_id (FK)                 │
│ name              │      │ name                         │
│ email             │      │ register_no                  │
│ designation       │      │ email                        │
│ department        │      │ phone                        │
│ ...               │      │ date_of_birth                │
└───────────────────┘      │ date_of_joining ← NEW        │
                           │ gender                       │
                           │ blood_group                  │
                           │ department                   │
                           │ branch ← NEW                 │
                           │ current_year                 │
                           │ semester                     │
                           │ batch                        │
                           │ section                      │
                           │ permanent_address ← NEW      │
                           │ communication_address ← NEW  │
                           │ father_name ← NEW            │
                           │ mother_name ← NEW            │
                           │ guardian_name ← NEW          │
                           │ guardian_phone ← NEW         │
                           │ credits_earned ← NEW         │
                           │ backlogs ← NEW               │
                           │ created_at                   │
                           │ updated_at                   │
                           └──────────────────────────────┘
```

## Permission Flow (RLS Policies)

```
User makes request to view/edit student data
         │
         ▼
┌────────────────────────────────────┐
│  Supabase checks auth.uid()        │
│  - Extracts JWT from request       │
│  - Validates token                 │
│  - Gets user_id                    │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│  Check RLS Policies                │
└────────┬───────────────────────────┘
         │
         ├─────────────────┬──────────────────┐
         ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Is Admin?    │  │ Is Student?  │  │ Otherwise    │
│              │  │              │  │              │
│ Check if     │  │ Check if     │  │ Access       │
│ user_id      │  │ user_id      │  │ DENIED       │
│ exists in    │  │ matches      │  │              │
│ admins table │  │ student's    │  │              │
│              │  │ user_id      │  │              │
└──────┬───────┘  └──────┬───────┘  └──────────────┘
       │                 │
       │ YES             │ YES
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ ALLOW:       │  │ ALLOW:       │
│ • SELECT all │  │ • SELECT own │
│ • UPDATE all │  │   data only  │
│ • INSERT     │  │ • UPDATE own │
│ • DELETE     │  │   data       │
└──────────────┘  └──────────────┘
```

## Component Interaction Sequence

```
Sequence: Admin Updates Student Information

Admin                AdminStudentEditor       Supabase             Database           Student UI
  │                         │                     │                    │                  │
  │ 1. Click Edit           │                     │                    │                  │
  ├────────────────────────▶│                     │                    │                  │
  │                         │                     │                    │                  │
  │                         │ 2. Load student     │                    │                  │
  │                         │    data             │                    │                  │
  │                         ├────────────────────▶│                    │                  │
  │                         │                     │ 3. Query           │                  │
  │                         │                     ├───────────────────▶│                  │
  │                         │                     │                    │                  │
  │                         │                     │ 4. Return data     │                  │
  │                         │                     │◀───────────────────┤                  │
  │                         │ 5. Display form     │                    │                  │
  │                         │◀────────────────────┤                    │                  │
  │                         │                     │                    │                  │
  │ 6. Edit fields          │                     │                    │                  │
  ├────────────────────────▶│                     │                    │                  │
  │                         │                     │                    │                  │
  │ 7. Click Save           │                     │                    │                  │
  ├────────────────────────▶│                     │                    │                  │
  │                         │                     │                    │                  │
  │                         │ 8. Send update      │                    │                  │
  │                         ├────────────────────▶│                    │                  │
  │                         │                     │                    │                  │
  │                         │                     │ 9. UPDATE query    │                  │
  │                         │                     ├───────────────────▶│                  │
  │                         │                     │                    │                  │
  │                         │                     │                    │ 10. Broadcast    │
  │                         │                     │                    │     UPDATE event │
  │                         │                     │                    ├─────────────────▶│
  │                         │                     │                    │                  │
  │                         │                     │ 11. Success        │                  │
  │                         │                     │◀───────────────────┤                  │
  │                         │                     │                    │                  │
  │                         │ 12. Show success    │                    │                  │
  │                         │◀────────────────────┤                    │                  │
  │                         │                     │                    │ 13. Re-fetch data│
  │                         │                     │                    │                  │
  │ 13. See success toast   │                     │                    │ 14. Update UI    │
  │◀────────────────────────┤                     │                    │     automatically│
  │                         │                     │                    │                  │
```

## File Structure

```
rit-atlas-d163cc60-main/
│
├── supabase/
│   ├── 01_schema.sql                    (original schema)
│   ├── 07_add_personal_academic_fields.sql  ← NEW MIGRATION
│   └── ...
│
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminStudentEditor.tsx   ← NEW COMPONENT
│   │   │   ├── StudentSelector.tsx      (existing)
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── PersonalInfo.tsx             ← MODIFIED (enhanced)
│   │   ├── AdminStudentManagement.tsx   ← NEW PAGE
│   │   └── ...
│   │
│   └── ...
│
├── IMPLEMENTATION_SUMMARY.md            ← Overview
├── PERSONAL_INFO_ENHANCEMENT.md         ← Technical docs
├── QUICK_SETUP.md                       ← Setup guide
└── SYSTEM_ARCHITECTURE.md               ← This file
```

---

## Key Technologies

- **Frontend:** React + TypeScript
- **UI Components:** shadcn/ui
- **State Management:** React hooks (useState, useEffect)
- **Backend:** Supabase (PostgreSQL)
- **Real-time:** Supabase Realtime (WebSockets)
- **Authentication:** Supabase Auth
- **Security:** Row Level Security (RLS)
- **Date Handling:** date-fns
- **Icons:** lucide-react
