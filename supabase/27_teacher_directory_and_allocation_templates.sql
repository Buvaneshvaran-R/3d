-- =====================================================
-- Teacher Directory + Allocation Templates Seed
-- =====================================================

-- 1) Seed teacher names into admins table (user_id can remain NULL for directory use).
INSERT INTO admins (user_id, name, email, department)
VALUES
  (NULL, 'Dr. Madhan',   'dr.madhan@rit.demo',   'AI & DS'),
  (NULL, 'Dr. Vignesh',  'dr.vignesh@rit.demo',  'CSE'),
  (NULL, 'Dr. Rekha',    'dr.rekha@rit.demo',    'IT'),
  (NULL, 'Dr. Kavya',    'dr.kavya@rit.demo',    'ECE'),
  (NULL, 'Dr. Naveen',   'dr.naveen@rit.demo',   'AI & DS'),
  (NULL, 'Dr. Rajesh',   'dr.rajesh@rit.demo',   'CSE'),
  (NULL, 'Dr. Priya',    'dr.priya@rit.demo',    'IT'),
  (NULL, 'Dr. Arjun',    'dr.arjun@rit.demo',    'ECE'),
  (NULL, 'Dr. Meena',    'dr.meena@rit.demo',    'AI & DS'),
  (NULL, 'Dr. Santhosh', 'dr.santhosh@rit.demo', 'CSE')
ON CONFLICT (email) DO NOTHING;

-- 2) Store timetable-like classroom allocation templates.
CREATE TABLE IF NOT EXISTS classroom_allocation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_code TEXT NOT NULL CHECK (block_code IN ('A', 'B', 'C')),
  floor_number INT NOT NULL,
  room_number INT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  slot_start TIME NOT NULL,
  slot_end TIME NOT NULL,
  subject TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  department TEXT NOT NULL,
  section TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('FREE', 'SCHEDULED', 'OCCUPIED', 'UNATTENDED', 'OFFSITE', 'SESSION_COMPLETED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (block_code, floor_number, room_number, day_of_week, slot_start)
);

CREATE INDEX IF NOT EXISTS idx_alloc_templates_teacher ON classroom_allocation_templates(teacher_name);
CREATE INDEX IF NOT EXISTS idx_alloc_templates_block_floor_room ON classroom_allocation_templates(block_code, floor_number, room_number);

-- 3) Seed templates for A(3x8), B(3x7), C(7x7) using deterministic distribution.
WITH days AS (
  SELECT unnest(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']) AS day_name, generate_series(1,5) AS day_idx
),
slots AS (
  SELECT * FROM (
    VALUES
      (1, '08:00'::time, '08:50'::time),
      (2, '08:50'::time, '09:40'::time),
      (3, '09:50'::time, '10:40'::time),
      (4, '10:50'::time, '11:40'::time),
      (5, '11:40'::time, '12:30'::time),
      (6, '13:20'::time, '14:10'::time),
      (7, '14:10'::time, '15:00'::time),
      (8, '15:00'::time, '15:50'::time)
  ) AS t(slot_idx, slot_start, slot_end)
),
subjects AS (
  SELECT ARRAY[
    'Machine Learning',
    'DAA',
    'Operating Systems',
    'DBMS',
    'Computer Networks',
    'Probability & Statistics',
    'Data Analytics',
    'AI Lab',
    'Cloud Computing',
    'Software Engineering'
  ] AS v
),
teachers AS (
  SELECT ARRAY[
    'Dr. Madhan',
    'Dr. Vignesh',
    'Dr. Rekha',
    'Dr. Kavya',
    'Dr. Naveen',
    'Dr. Rajesh',
    'Dr. Priya',
    'Dr. Arjun',
    'Dr. Meena',
    'Dr. Santhosh'
  ] AS v
),
departments AS (
  SELECT ARRAY['AI & DS', 'CSE', 'IT', 'ECE'] AS v
),
sections AS (
  SELECT ARRAY['II AI&DS A', 'III AI&DS A', 'II CSE B', 'III CSE A', 'II IT A', 'III IT B'] AS v
),
rooms AS (
  SELECT 'A'::text AS block_code, f AS floor_number, r AS room_number
  FROM generate_series(1, 3) AS f
  CROSS JOIN generate_series(1, 8) AS r
  UNION ALL
  SELECT 'B'::text AS block_code, f AS floor_number, r AS room_number
  FROM generate_series(1, 3) AS f
  CROSS JOIN generate_series(1, 7) AS r
  UNION ALL
  SELECT 'C'::text AS block_code, f AS floor_number, r AS room_number
  FROM generate_series(1, 7) AS f
  CROSS JOIN generate_series(1, 7) AS r
),
seed_rows AS (
  SELECT
    rm.block_code,
    rm.floor_number,
    rm.room_number,
    d.day_name,
    s.slot_start,
    s.slot_end,
    (SELECT v[((idx % array_length(v, 1)) + 1)] FROM subjects, LATERAL (SELECT (rm.floor_number * 17 + rm.room_number * 11 + d.day_idx * 7 + s.slot_idx) AS idx) t) AS subject,
    (SELECT v[((idx % array_length(v, 1)) + 1)] FROM teachers, LATERAL (SELECT (rm.floor_number * 13 + rm.room_number * 5 + d.day_idx * 3 + s.slot_idx) AS idx) t) AS teacher_name,
    (SELECT v[((idx % array_length(v, 1)) + 1)] FROM departments, LATERAL (SELECT (rm.floor_number * 9 + rm.room_number * 2 + s.slot_idx) AS idx) t) AS department,
    (SELECT v[((idx % array_length(v, 1)) + 1)] FROM sections, LATERAL (SELECT (rm.room_number * 3 + d.day_idx + s.slot_idx) AS idx) t) AS section
  FROM rooms rm
  CROSS JOIN days d
  CROSS JOIN slots s
)
INSERT INTO classroom_allocation_templates (
  block_code,
  floor_number,
  room_number,
  day_of_week,
  slot_start,
  slot_end,
  subject,
  teacher_name,
  department,
  section,
  status
)
SELECT
  block_code,
  floor_number,
  room_number,
  day_name,
  slot_start,
  slot_end,
  subject,
  teacher_name,
  department,
  section,
  'SCHEDULED'
FROM seed_rows
ON CONFLICT (block_code, floor_number, room_number, day_of_week, slot_start) DO NOTHING;
