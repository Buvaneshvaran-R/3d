-- Smart Classroom Feature Tables

-- 1. Blocks (Building blocks)
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  shape TEXT NOT NULL, -- 'square', 'rectangle'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Floors (Building floors within blocks)
CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  floor_number INT NOT NULL,
  capacity INT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_block_floor UNIQUE(block_id, floor_number)
);

-- 3. Classrooms (Individual classrooms)
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  floor_number INT NOT NULL,
  classroom_number INT NOT NULL,
  capacity INT DEFAULT 30,
  status TEXT DEFAULT 'available', -- 'available', 'occupied', 'unattended'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_classroom UNIQUE(block_id, floor_number, classroom_number)
);

-- 4. Teacher-Classroom Allocation
CREATE TABLE IF NOT EXISTS teacher_classroom_allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  subject TEXT,
  time_slot TEXT,
  day_of_week TEXT,
  allocated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_allocation UNIQUE(teacher_id, classroom_id)
);

-- 5. Classroom Attendance (Real-time tracking)
CREATE TABLE IF NOT EXISTS classroom_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marked_in_at TIMESTAMP DEFAULT NOW(),
  marked_out_at TIMESTAMP,
  status TEXT DEFAULT 'occupied', -- 'occupied', 'available', 'unattended'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for security
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classroom_allocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_attendance ENABLE ROW LEVEL SECURITY;

-- Policies for blocks (public read)
CREATE POLICY "Blocks are viewable by all"
  ON blocks FOR SELECT
  USING (true);

-- Policies for floors (public read)
CREATE POLICY "Floors are viewable by all"
  ON floors FOR SELECT
  USING (true);

-- Policies for classrooms (public read)
CREATE POLICY "Classrooms are viewable by all"
  ON classrooms FOR SELECT
  USING (true);

CREATE POLICY "Teachers can update classroom status"
  ON classrooms FOR UPDATE
  USING (auth.uid() IN (SELECT teacher_id FROM teacher_classroom_allocation WHERE classroom_id = id))
  WITH CHECK (auth.uid() IN (SELECT teacher_id FROM teacher_classroom_allocation WHERE classroom_id = id));

-- Policies for teacher allocation
CREATE POLICY "Teachers can view their allocations"
  ON teacher_classroom_allocation FOR SELECT
  USING (auth.uid() = teacher_id OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Policies for attendance
CREATE POLICY "Teachers can insert attendance"
  ON classroom_attendance FOR INSERT
  USING (auth.uid() = teacher_id AND auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Teachers can view attendance"
  ON classroom_attendance FOR SELECT
  USING (auth.uid() = teacher_id OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Indexes for better performance
CREATE INDEX idx_floors_block_id ON floors(block_id);
CREATE INDEX idx_classrooms_block_id ON classrooms(block_id);
CREATE INDEX idx_classrooms_floor_id ON classrooms(floor_id);
CREATE INDEX idx_teacher_allocation_teacher_id ON teacher_classroom_allocation(teacher_id);
CREATE INDEX idx_teacher_allocation_classroom_id ON teacher_classroom_allocation(classroom_id);
CREATE INDEX idx_attendance_classroom_id ON classroom_attendance(classroom_id);
CREATE INDEX idx_attendance_teacher_id ON classroom_attendance(teacher_id);
