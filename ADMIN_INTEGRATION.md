# Admin Role Integration Guide

## Overview
The RIT Student Portal now supports **Admin Role** functionality, allowing Admin Officers to view and manage student data through the same UI.

## ✅ What's Been Implemented

### 1. Authentication System
- **Dual Login**: `/login` for students, `/admin-login` for admin officers
- **AuthContext**: Centralized role management (`src/contexts/AuthContext.tsx`)
- **Role-based rendering**: Components adapt based on user role

### 2. Admin Features
- **Student Selector**: Admin can search and select students by:
  - Register Number
  - Name  
  - Department
- **Same UI, Different Permissions**: Admin sees identical UI with edit capabilities

### 3. Updated Components

#### Core Files:
- `src/contexts/AuthContext.tsx` - Role management and student selection
- `src/components/admin/StudentSelector.tsx` - Student search/select component  
- `src/components/admin/AdminAttendanceEditor.tsx` - Example editable component
- `src/pages/Login.tsx` - Supports both student and admin login
- `src/App.tsx` - Added AuthProvider wrapper
- `src/components/layout/DashboardLayout.tsx` - Shows student selector for admin

#### Example Editable Pages:
- `src/pages/PersonalInfo.tsx` - Edit student personal details
- `src/pages/Attendance.tsx` - Manage attendance records

## 🎯 How to Use

### For Developers: Making Pages Editable

To make any page editable for admins, follow this pattern:

```tsx
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Edit2, Save, X } from "lucide-react";

const YourPage = () => {
  const { isAdmin, selectedStudent } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState({ /* initial data */ });

  const handleSave = () => {
    // API call to save data
    setIsEditing(false);
  };

  return (
    <div>
      {/* Admin Edit Controls */}
      {isAdmin() && selectedStudent && (
        <div className="flex gap-2 mb-4">
          {isEditing ? (
            <>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      )}

      {/* Your existing UI */}
      {/* Toggle between view/edit mode based on isEditing */}
    </div>
  );
};
```

### For Testers:

1. **Login as Admin**:
   - Navigate to `/admin-login`
   - Enter admin credentials
   - Click "Admin Login"

2. **Select a Student**:
   - Use the student selector at the top
   - Search by register number, name, or department
   - Click on a student to select

3. **Manage Data**:
   - Navigate to any page (Personal Info, Attendance, etc.)
   - Click "Edit" button (visible only for admin)
   - Modify data
   - Click "Save" to persist changes

## 📋 Remaining Work

### Pages to Make Editable:
- [ ] CAT Marks - Add input fields for CAT I, II, III
- [ ] LAB Marks - Add Internal, Viva, Record inputs
- [ ] Assignment Marks - Add A1-A5 input fields
- [ ] Grade Book - Add semester GPA entry
- [ ] Subject Registration - Add assign/remove subjects
- [ ] Fee Details - Add payment update functionality
- [ ] Certificates - Add approve/reject buttons
- [ ] Messages - Add announcement creation form
- [ ] Feedbacks - Add enable/disable controls

### Pattern for Each:
1. Import `useAuth` hook
2. Add edit/save state management
3. Add admin-only edit buttons
4. Toggle between view/edit modes
5. Include save/cancel actions

## 🔒 Security Notes

**IMPORTANT**: The current implementation is UI-only. You must:

1. **Add Backend Authentication**:
   ```tsx
   const handleLogin = async (e: React.FormEvent) => {
     e.preventDefault();
     const response = await fetch('/api/auth/login', {
       method: 'POST',
       body: JSON.stringify({ username, password, role: isAdminLogin ? 'admin' : 'student' })
     });
     const userData = await response.json();
     login(userData);
   };
   ```

2. **Protect API Endpoints**: Verify role on backend before allowing modifications

3. **Replace Mock Data**: Connect all pages to real API endpoints

## 📚 API Integration Points

Each page needs these API calls:

```typescript
// GET student data
GET /api/students/:id

// UPDATE student data (admin only)
PUT /api/students/:id

// Specific endpoints
PUT /api/students/:id/attendance
PUT /api/students/:id/marks/cat
PUT /api/students/:id/marks/lab
PUT /api/students/:id/marks/assignment
PUT /api/students/:id/grades
POST /api/certificates/:id/approve
POST /api/messages/broadcast
```

## 🎨 UI Consistency Rules

✅ **DO**:
- Keep the exact same card designs
- Use existing color scheme
- Maintain spacing and typography
- Add subtle badges/indicators for admin mode

❌ **DON'T**:
- Create new layouts
- Change colors or themes
- Add flashy admin-only sections
- Redesign existing components

## 🚀 Next Steps

1. **Implement Remaining Pages**: Follow the PersonalInfo.tsx pattern
2. **Add Backend Integration**: Replace mock data with real API calls
3. **Add Validation**: Ensure data integrity before saving
4. **Add Permissions**: Fine-grained control (e.g., only registrar can edit fees)
5. **Add Audit Logs**: Track who changed what and when

## 💡 Tips

- Use the `useAuth()` hook to check roles: `isAdmin()`, `isStudent()`
- Check if student is selected: `selectedStudent`
- Admin components should be subtle - same design, just editable
- Always provide cancel option
- Show loading states during saves
- Display success/error toasts

## 🐛 Troubleshooting

**Admin selector not showing?**
- Check if `isAdmin()` returns true
- Verify AuthProvider wraps the app

**Edit buttons not appearing?**
- Ensure student is selected
- Check `isAdmin() && selectedStudent` condition

**Changes not persisting?**
- API endpoints not yet implemented
- Check console for errors

---

For questions or issues, refer to the example implementations in:
- `src/pages/PersonalInfo.tsx`
- `src/components/admin/AdminAttendanceEditor.tsx`
