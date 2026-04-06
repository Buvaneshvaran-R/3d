-- =====================================================
-- Classroom Intelligence Module Seed (Sample for current date)
-- =====================================================

-- Link first admin user as fallback teacher for demo schedules.
WITH admin_user AS (
  SELECT user_id FROM admins WHERE user_id IS NOT NULL LIMIT 1
),
room_pick AS (
  SELECT id AS classroom_id
  FROM classrooms
  ORDER BY floor_number, classroom_number
  LIMIT 9
),
slot_plan AS (
  SELECT
    rp.classroom_id,
    (SELECT user_id FROM admin_user) AS teacher_user_id,
    CASE
      WHEN ROW_NUMBER() OVER () % 3 = 1 THEN 'Data Structures'
      WHEN ROW_NUMBER() OVER () % 3 = 2 THEN 'Operating Systems'
      ELSE 'Database Systems'
    END AS subject,
    'CSE' AS department,
    CASE
      WHEN ROW_NUMBER() OVER () % 2 = 0 THEN 'A'
      ELSE 'B'
    END AS section,
    (date_trunc('day', NOW()) + interval '8 hour' + ((ROW_NUMBER() OVER () - 1) * interval '1 hour')) AS slot_start,
    (date_trunc('day', NOW()) + interval '8 hour' + ((ROW_NUMBER() OVER ()) * interval '1 hour')) AS slot_end
  FROM room_pick rp
)
INSERT INTO classroom_schedule_slots (
  classroom_id,
  teacher_user_id,
  subject,
  department,
  section,
  slot_start,
  slot_end,
  session_status
)
SELECT
  sp.classroom_id,
  sp.teacher_user_id,
  sp.subject,
  sp.department,
  sp.section,
  sp.slot_start,
  sp.slot_end,
  'SCHEDULED'
FROM slot_plan sp
WHERE sp.teacher_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Recompute live state after seed.
SELECT refresh_classroom_intelligence_states(NOW(), 10);
