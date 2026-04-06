# 🏗️ RIT STUDENT PORTAL - BACKEND ARCHITECTURE

## 🎯 System Overview

**Role-Based Academic Management System** where:
- **Admin**: Uploads & manages all student data
- **Student**: Views data in real-time + submits requests
- **Shared Database**: Single source of truth for both roles
- **Two-Way Data Flow**: Admin ↔ Student without duplication

---

## 🔐 1. AUTHENTICATION & AUTHORIZATION

### Technology Stack
```
- JWT (JSON Web Tokens) for stateless auth
- bcrypt for password hashing
- Refresh tokens for security
```

### Database Schema: Users & Auth

```sql
-- Users Table (Shared for Admin & Student)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Profile (extends users with role='student')
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    register_no VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    blood_group VARCHAR(5),
    department VARCHAR(100),
    batch VARCHAR(20),
    semester INT,
    section VARCHAR(10),
    current_year INT,
    profile_photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Profile (extends users with role='admin')
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    designation VARCHAR(100),
    department VARCHAR(100),
    profile_photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens (for secure session management)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Auth Endpoints

```typescript
POST   /api/auth/login              // Student/Admin login (returns JWT + role)
POST   /api/auth/admin-login        // Separate admin endpoint (optional)
POST   /api/auth/logout             // Invalidate tokens
POST   /api/auth/refresh            // Refresh access token
POST   /api/auth/change-password    // Change password
GET    /api/auth/me                 // Get current user profile
```

### JWT Payload Structure

```typescript
interface JWTPayload {
  userId: string;
  role: 'admin' | 'student';
  email: string;
  studentId?: string;  // Only for students
  adminId?: string;    // Only for admins
  iat: number;
  exp: number;
}
```

---

## 📊 2. DATABASE SCHEMA (PostgreSQL Recommended)

### Core Academic Tables

```sql
-- Subjects/Courses
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    semester INT,
    credits INT,
    type ENUM('Theory', 'Lab', 'Both'),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student-Subject Registration (Many-to-Many)
CREATE TABLE student_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    semester INT NOT NULL,
    academic_year VARCHAR(20),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id, semester)
);

-- Attendance Records
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Leave', 'OD') NOT NULL,
    marked_by UUID REFERENCES admins(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id, date)
);

-- CAT Marks (Continuous Assessment Test)
CREATE TABLE cat_marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    cat_type ENUM('CAT1', 'CAT2', 'CAT3') NOT NULL,
    marks_obtained DECIMAL(5,2),
    max_marks DECIMAL(5,2) DEFAULT 50.00,
    exam_date DATE,
    entered_by UUID REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id, cat_type)
);

-- Lab Marks
CREATE TABLE lab_marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    internal_marks DECIMAL(5,2),
    max_internal DECIMAL(5,2) DEFAULT 60.00,
    viva_marks DECIMAL(5,2),
    max_viva DECIMAL(5,2) DEFAULT 20.00,
    record_marks DECIMAL(5,2),
    max_record DECIMAL(5,2) DEFAULT 20.00,
    entered_by UUID REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id)
);

-- Assignment Marks
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    max_marks DECIMAL(5,2) DEFAULT 10.00,
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2),
    submitted_at TIMESTAMP,
    graded_by UUID REFERENCES admins(id),
    graded_at TIMESTAMP,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- Grade Book
CREATE TABLE grade_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    semester INT NOT NULL,
    academic_year VARCHAR(20),
    gpa DECIMAL(3,2),
    cgpa DECIMAL(3,2),
    total_credits INT,
    is_locked BOOLEAN DEFAULT false,
    locked_by UUID REFERENCES admins(id),
    locked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, semester, academic_year)
);

-- Subject-wise Grades
CREATE TABLE subject_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_book_id UUID REFERENCES grade_book(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    grade VARCHAR(2),
    grade_points DECIMAL(3,2),
    credits INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fee Details
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department VARCHAR(100),
    semester INT,
    academic_year VARCHAR(20),
    tuition_fee DECIMAL(10,2),
    library_fee DECIMAL(10,2),
    lab_fee DECIMAL(10,2),
    other_fees DECIMAL(10,2),
    total_fee DECIMAL(10,2),
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id),
    semester INT NOT NULL,
    academic_year VARCHAR(20),
    total_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    balance DECIMAL(10,2),
    payment_status ENUM('Pending', 'Partial', 'Paid') DEFAULT 'Pending',
    due_date DATE,
    updated_by UUID REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, semester, academic_year)
);

CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_fee_id UUID REFERENCES student_fees(id) ON DELETE CASCADE,
    amount DECIMAL(10,2),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    payment_date DATE,
    receipt_no VARCHAR(50),
    recorded_by UUID REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time Table
CREATE TABLE timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department VARCHAR(100),
    semester INT,
    section VARCHAR(10),
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
    period_no INT,
    start_time TIME,
    end_time TIME,
    subject_id UUID REFERENCES subjects(id),
    room_no VARCHAR(20),
    faculty_name VARCHAR(255),
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department, semester, section, day_of_week, period_no)
);
```

### Request Management (Student → Admin Flow)

```sql
-- Leave/OD Requests
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    request_type ENUM('Leave', 'OD') NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT NOT NULL,
    supporting_document_url TEXT,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    reviewed_by UUID REFERENCES admins(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Certificate Requests
CREATE TABLE certificate_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    certificate_type VARCHAR(100) NOT NULL,
    purpose TEXT,
    quantity INT DEFAULT 1,
    status ENUM('Pending', 'Processing', 'Ready', 'Issued', 'Rejected') DEFAULT 'Pending',
    processed_by UUID REFERENCES admins(id),
    issued_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback (Student → Admin)
CREATE TABLE feedback_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE feedback_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES feedback_forms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    response_data JSONB NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(form_id, student_id)
);
```

### Communication (Admin → Student Flow)

```sql
-- Messages/Announcements
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES admins(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('General', 'Academic', 'Event', 'Alert', 'Fee') DEFAULT 'General',
    priority ENUM('Low', 'Normal', 'High', 'Urgent') DEFAULT 'Normal',
    target_type ENUM('All', 'Department', 'Batch', 'Semester', 'Individual') NOT NULL,
    target_filter JSONB,  -- {department: "CSE", semester: 3}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Message Read Status
CREATE TABLE message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, student_id)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Audit & Activity Log

```sql
-- Activity Log (track all changes)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_attendance_student_subject ON attendance(student_id, subject_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
```

---

## 🌐 3. API ENDPOINTS STRUCTURE

### Base URL
```
Production: https://api.ritatlas.edu
Development: http://localhost:3000/api
```

### Authentication (Public)
```
POST   /api/auth/login
POST   /api/auth/admin-login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/change-password
GET    /api/auth/me
```

### Student Endpoints (Role: student)
```
GET    /api/student/profile
PUT    /api/student/profile
GET    /api/student/attendance
GET    /api/student/attendance/:subjectId
GET    /api/student/cat-marks
GET    /api/student/lab-marks
GET    /api/student/assignments
GET    /api/student/assignment/:id/submit
GET    /api/student/grades
GET    /api/student/fees
GET    /api/student/timetable
GET    /api/student/messages
POST   /api/student/messages/:id/read
GET    /api/student/notifications
PUT    /api/student/notifications/:id/read
POST   /api/student/leave-request
GET    /api/student/leave-requests
POST   /api/student/certificate-request
GET    /api/student/certificate-requests
POST   /api/student/feedback/:formId
```

### Admin Endpoints (Role: admin)

#### Student Management
```
GET    /api/admin/students                      // List all students
GET    /api/admin/students/:id                  // Get specific student
POST   /api/admin/students                      // Create student
PUT    /api/admin/students/:id                  // Update student
DELETE /api/admin/students/:id                  // Delete student
GET    /api/admin/students/search               // Search students
POST   /api/admin/students/bulk-upload          // CSV/Excel upload
```

#### Subject Management
```
GET    /api/admin/subjects
POST   /api/admin/subjects
PUT    /api/admin/subjects/:id
DELETE /api/admin/subjects/:id
POST   /api/admin/subjects/:id/assign-students
```

#### Attendance Management
```
GET    /api/admin/attendance
POST   /api/admin/attendance                    // Mark attendance
PUT    /api/admin/attendance/:id
DELETE /api/admin/attendance/:id
POST   /api/admin/attendance/bulk               // Mark for multiple students
GET    /api/admin/attendance/report             // Generate reports
```

#### Marks Management
```
POST   /api/admin/cat-marks
PUT    /api/admin/cat-marks/:id
DELETE /api/admin/cat-marks/:id
POST   /api/admin/cat-marks/bulk

POST   /api/admin/lab-marks
PUT    /api/admin/lab-marks/:id
DELETE /api/admin/lab-marks/:id

POST   /api/admin/assignments
PUT    /api/admin/assignments/:id
DELETE /api/admin/assignments/:id
GET    /api/admin/assignments/:id/submissions
PUT    /api/admin/assignments/:id/submissions/:studentId/grade
```

#### Grade Book Management
```
GET    /api/admin/grades/:studentId
POST   /api/admin/grades/:studentId/semester
PUT    /api/admin/grades/:id
POST   /api/admin/grades/:id/lock
```

#### Fee Management
```
GET    /api/admin/fees
POST   /api/admin/fees/structure
PUT    /api/admin/fees/structure/:id
POST   /api/admin/fees/assign-students
PUT    /api/admin/fees/student/:studentId
POST   /api/admin/fees/payment
GET    /api/admin/fees/reports
```

#### Timetable Management
```
GET    /api/admin/timetable
POST   /api/admin/timetable
PUT    /api/admin/timetable/:id
DELETE /api/admin/timetable/:id
POST   /api/admin/timetable/bulk
```

#### Request Management
```
GET    /api/admin/leave-requests
PUT    /api/admin/leave-requests/:id/approve
PUT    /api/admin/leave-requests/:id/reject

GET    /api/admin/certificate-requests
PUT    /api/admin/certificate-requests/:id/status
```

#### Communication
```
POST   /api/admin/messages
GET    /api/admin/messages
PUT    /api/admin/messages/:id
DELETE /api/admin/messages/:id
GET    /api/admin/messages/:id/analytics        // Read statistics

POST   /api/admin/feedback-forms
GET    /api/admin/feedback-forms
GET    /api/admin/feedback-forms/:id/responses
```

#### Analytics & Reports
```
GET    /api/admin/analytics/dashboard
GET    /api/admin/analytics/attendance-summary
GET    /api/admin/analytics/marks-distribution
GET    /api/admin/analytics/fee-collection
GET    /api/admin/reports/student-performance
GET    /api/admin/reports/attendance
POST   /api/admin/reports/generate
```

---

## 🏗️ 4. BACKEND FOLDER STRUCTURE

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # DB connection config
│   │   ├── jwt.ts               # JWT config
│   │   └── app.ts               # Express app config
│   │
│   ├── middleware/
│   │   ├── auth.ts              # JWT authentication
│   │   ├── roleCheck.ts         # Role-based access control
│   │   ├── validation.ts        # Request validation
│   │   ├── errorHandler.ts      # Global error handler
│   │   └── rateLimiter.ts       # Rate limiting
│   │
│   ├── models/
│   │   ├── User.ts
│   │   ├── Student.ts
│   │   ├── Admin.ts
│   │   ├── Attendance.ts
│   │   ├── CATMarks.ts
│   │   ├── LabMarks.ts
│   │   ├── Assignment.ts
│   │   ├── GradeBook.ts
│   │   ├── Fee.ts
│   │   ├── Timetable.ts
│   │   ├── LeaveRequest.ts
│   │   ├── CertificateRequest.ts
│   │   ├── Message.ts
│   │   ├── Notification.ts
│   │   └── index.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── student.controller.ts
│   │   ├── admin/
│   │   │   ├── student.controller.ts
│   │   │   ├── attendance.controller.ts
│   │   │   ├── marks.controller.ts
│   │   │   ├── grades.controller.ts
│   │   │   ├── fees.controller.ts
│   │   │   ├── timetable.controller.ts
│   │   │   ├── requests.controller.ts
│   │   │   ├── messages.controller.ts
│   │   │   └── analytics.controller.ts
│   │   └── index.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── email.service.ts
│   │   ├── notification.service.ts
│   │   ├── upload.service.ts
│   │   ├── report.service.ts
│   │   └── analytics.service.ts
│   │
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── student.routes.ts
│   │   ├── admin.routes.ts
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   ├── helpers.ts
│   │   └── constants.ts
│   │
│   ├── types/
│   │   ├── express.d.ts
│   │   └── index.ts
│   │
│   └── index.ts                 # Entry point
│
├── database/
│   ├── migrations/               # Database migrations
│   ├── seeds/                    # Seed data
│   └── schema.sql                # Complete SQL schema
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔒 5. MIDDLEWARE & SECURITY

### Authentication Middleware

```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface JWTPayload {
  userId: string;
  role: 'admin' | 'student';
  email: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

### Role-Based Access Control

```typescript
// middleware/roleCheck.ts
import { Request, Response, NextFunction } from 'express';

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireStudent = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ error: 'Student access required' });
  }
  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### Request Validation

```typescript
// middleware/validation.ts
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
};
```

---

## 📡 6. REAL-TIME FEATURES (Optional)

### WebSocket Integration for Live Updates

```typescript
// For real-time notifications and updates
import { Server } from 'socket.io';

// When admin updates marks
io.to(`student:${studentId}`).emit('marks_updated', {
  subject: 'Data Structures',
  type: 'CAT1',
  marks: 45
});

// When admin posts announcement
io.to('department:CSE').emit('new_message', {
  title: 'Holiday Notification',
  content: '...'
});

// When leave request status changes
io.to(`student:${studentId}`).emit('leave_status_updated', {
  status: 'Approved'
});
```

---

## 🚀 7. TECHNOLOGY RECOMMENDATIONS

### Backend Stack
```
Runtime:          Node.js (v18+) with TypeScript
Framework:        Express.js or Fastify
Database:         PostgreSQL (primary) + Redis (caching)
ORM:              Prisma or TypeORM
Authentication:   JWT with Passport.js
Validation:       Zod or Joi
File Upload:      Multer + AWS S3 / Cloudinary
Real-time:        Socket.IO (optional)
Email:            Nodemailer + SendGrid
Testing:          Jest + Supertest
Documentation:    Swagger/OpenAPI
Logging:          Winston or Pino
```

### Deployment
```
Hosting:          AWS EC2 / DigitalOcean / Heroku
Database:         AWS RDS (PostgreSQL)
Cache:            Redis Cloud
File Storage:     AWS S3
CI/CD:            GitHub Actions
Monitoring:       PM2 + Sentry + DataDog
```

---

## 📝 8. IMPLEMENTATION PRIORITY

### Phase 1 (Core - Week 1-2)
- [ ] Database setup + migrations
- [ ] Authentication system
- [ ] Student profile endpoints
- [ ] Admin dashboard basics

### Phase 2 (Academic - Week 3-4)
- [ ] Attendance management
- [ ] Marks management (CAT, Lab, Assignment)
- [ ] Grade book
- [ ] Subject registration

### Phase 3 (Administrative - Week 5)
- [ ] Fee management
- [ ] Timetable management
- [ ] Certificate requests
- [ ] Leave/OD requests

### Phase 4 (Communication - Week 6)
- [ ] Messages/Announcements
- [ ] Notifications system
- [ ] Feedback forms
- [ ] Email integration

### Phase 5 (Polish - Week 7-8)
- [ ] Analytics dashboard
- [ ] Reports generation
- [ ] File uploads
- [ ] Real-time features
- [ ] Testing + Documentation

---

## 🔐 9. SECURITY CHECKLIST

- [ ] JWT with short expiry (15 min) + refresh tokens (7 days)
- [ ] Password hashing with bcrypt (salt rounds: 12)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use ORM)
- [ ] XSS protection (sanitize inputs)
- [ ] CSRF tokens for state-changing operations
- [ ] Rate limiting (express-rate-limit)
- [ ] CORS configuration
- [ ] Helmet.js for security headers
- [ ] HTTPS only in production
- [ ] Environment variables for secrets
- [ ] Role-based access control
- [ ] Activity logging
- [ ] File upload validation
- [ ] API versioning

---

## 📊 10. DATA FLOW EXAMPLES

### Example 1: Admin Marks Student's Attendance
```
1. Admin selects student(s) + subject + date
2. POST /api/admin/attendance
3. Insert into attendance table
4. Trigger notification to student
5. Student sees updated attendance on GET /api/student/attendance
```

### Example 2: Student Requests Leave
```
1. Student fills leave request form
2. POST /api/student/leave-request
3. Insert into leave_requests table (status: Pending)
4. Trigger notification to admin
5. Admin sees request in GET /api/admin/leave-requests
6. Admin approves: PUT /api/admin/leave-requests/:id/approve
7. Update status to Approved
8. Trigger notification to student
9. Student sees updated status
```

### Example 3: Admin Posts Announcement
```
1. Admin creates message
2. POST /api/admin/messages with target_filter: {department: "CSE"}
3. Insert into messages table
4. Background job: Create notifications for all matching students
5. Students see message in GET /api/student/messages
6. Unread count shows in notification bell
```

---

## 🎯 11. API RESPONSE FORMAT

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2025-12-27T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [ ... ]
  },
  "timestamp": "2025-12-27T10:30:00Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "timestamp": "2025-12-27T10:30:00Z"
}
```

---

## 📞 12. INTEGRATION WITH FRONTEND

### API Client Setup (Frontend)

```typescript
// src/lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token logic
      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await axios.post('/api/auth/refresh', { refreshToken });
      localStorage.setItem('accessToken', data.accessToken);
      return apiClient(error.config);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Environment Variables (.env)

```env
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/rit_portal
JWT_SECRET=your-super-secret-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
PORT=3000

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=rit-portal-uploads

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Frontend
VITE_API_URL=http://localhost:3000/api
```

---

## ✅ FINAL CHECKLIST

### Before Development
- [ ] Review and finalize database schema
- [ ] Set up version control (Git)
- [ ] Create development environment
- [ ] Install dependencies
- [ ] Configure database connection

### During Development
- [ ] Follow RESTful conventions
- [ ] Write tests for each endpoint
- [ ] Document API with Swagger
- [ ] Implement error handling
- [ ] Add logging

### Before Production
- [ ] Security audit
- [ ] Performance testing
- [ ] Load testing
- [ ] Backup strategy
- [ ] Monitoring setup
- [ ] SSL certificate
- [ ] Domain configuration

---

## 🎓 SUMMARY

This architecture provides:

✅ **Single Source of Truth**: One database for both roles  
✅ **Clear Separation**: Role-based endpoints with proper access control  
✅ **Two-Way Flow**: Admin uploads → Student views, Student requests → Admin acts  
✅ **Scalable**: Can handle thousands of students  
✅ **Secure**: JWT auth + validation + RBAC  
✅ **Maintainable**: Clean structure + TypeScript  
✅ **Real-time Ready**: Can add WebSocket for live updates  
✅ **Production Ready**: Complete with logging, monitoring, error handling  

**Next Step**: Choose your tech stack and start with Phase 1 (Authentication + Database Setup)!
