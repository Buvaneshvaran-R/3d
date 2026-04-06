-- =====================================================
-- Classroom Intelligence Module
-- =====================================================

-- 1) Extend classroom status values for richer live states.
ALTER TABLE classrooms
  DROP CONSTRAINT IF EXISTS classrooms_status_check;

ALTER TABLE classrooms
  ADD CONSTRAINT classrooms_status_check
  CHECK (status IN ('available', 'scheduled', 'occupied', 'unattended'));

-- 2) Live schedule slots (source of truth for sessions).
CREATE TABLE IF NOT EXISTS classroom_schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  department TEXT,
  section TEXT,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  session_status TEXT DEFAULT 'SCHEDULED'
    CHECK (session_status IN ('SCHEDULED', 'OCCUPIED', 'UNATTENDED', 'SESSION_COMPLETED', 'OFFSITE')),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  offsite_marked_at TIMESTAMPTZ,
  offsite_marked_by UUID REFERENCES auth.users(id),
  offsite_reason TEXT,
  attendance_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (slot_end > slot_start)
);

CREATE INDEX IF NOT EXISTS idx_schedule_slot_classroom ON classroom_schedule_slots(classroom_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slot_teacher ON classroom_schedule_slots(teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slot_start_end ON classroom_schedule_slots(slot_start, slot_end);

-- 3) Session archive for analytics and reporting.
CREATE TABLE IF NOT EXISTS classroom_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_slot_id UUID REFERENCES classroom_schedule_slots(id) ON DELETE SET NULL,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_user_id UUID REFERENCES auth.users(id),
  teacher_name TEXT,
  department TEXT,
  section TEXT,
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ NOT NULL,
  session_status TEXT NOT NULL,
  attendance_ref TEXT,
  offsite_flag BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_logs_classroom ON classroom_session_logs(classroom_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_teacher ON classroom_session_logs(teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_status ON classroom_session_logs(session_status);

-- 4) Enable RLS.
ALTER TABLE classroom_schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_session_logs ENABLE ROW LEVEL SECURITY;

-- 5) Policies.
DROP POLICY IF EXISTS "schedule slots readable by authenticated users" ON classroom_schedule_slots;
CREATE POLICY "schedule slots readable by authenticated users"
  ON classroom_schedule_slots FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "teachers and admins can update assigned slots" ON classroom_schedule_slots;
CREATE POLICY "teachers and admins can update assigned slots"
  ON classroom_schedule_slots FOR UPDATE
  USING (
    auth.uid() = teacher_user_id OR
    auth.uid() IN (SELECT user_id FROM admins)
  )
  WITH CHECK (
    auth.uid() = teacher_user_id OR
    auth.uid() IN (SELECT user_id FROM admins)
  );

DROP POLICY IF EXISTS "teachers and admins can insert slots" ON classroom_schedule_slots;
CREATE POLICY "teachers and admins can insert slots"
  ON classroom_schedule_slots FOR INSERT
  WITH CHECK (
    auth.uid() = teacher_user_id OR
    auth.uid() IN (SELECT user_id FROM admins)
  );

DROP POLICY IF EXISTS "session logs readable by authenticated users" ON classroom_session_logs;
CREATE POLICY "session logs readable by authenticated users"
  ON classroom_session_logs FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admins can insert session logs" ON classroom_session_logs;
CREATE POLICY "admins can insert session logs"
  ON classroom_session_logs FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admins));

-- 6) Sync helper: derive unattended/completed state by time and grace period.
CREATE OR REPLACE FUNCTION refresh_classroom_intelligence_states(
  p_reference_time TIMESTAMPTZ DEFAULT NOW(),
  p_grace_minutes INT DEFAULT 10
)
RETURNS VOID AS $$
BEGIN
  -- Mark overdue scheduled classes as UNATTENDED.
  UPDATE classroom_schedule_slots
  SET
    session_status = 'UNATTENDED',
    updated_at = NOW()
  WHERE
    session_status = 'SCHEDULED'
    AND confirmed_at IS NULL
    AND offsite_marked_at IS NULL
    AND p_reference_time > slot_start + (p_grace_minutes || ' minutes')::interval
    AND p_reference_time < slot_end;

  -- Mark finished sessions as SESSION_COMPLETED when not offsite.
  UPDATE classroom_schedule_slots
  SET
    session_status = 'SESSION_COMPLETED',
    updated_at = NOW()
  WHERE
    session_status IN ('SCHEDULED', 'OCCUPIED', 'UNATTENDED')
    AND p_reference_time >= slot_end;

  -- Materialize live classroom status for quick UI reads.
  UPDATE classrooms c
  SET
    status = CASE
      WHEN EXISTS (
        SELECT 1
        FROM classroom_schedule_slots s
        WHERE s.classroom_id = c.id
          AND p_reference_time >= s.slot_start
          AND p_reference_time < s.slot_end
          AND s.offsite_marked_at IS NULL
          AND s.session_status = 'OCCUPIED'
      ) THEN 'occupied'
      WHEN EXISTS (
        SELECT 1
        FROM classroom_schedule_slots s
        WHERE s.classroom_id = c.id
          AND p_reference_time >= s.slot_start
          AND p_reference_time < s.slot_end
          AND s.offsite_marked_at IS NULL
          AND s.session_status = 'UNATTENDED'
      ) THEN 'unattended'
      WHEN EXISTS (
        SELECT 1
        FROM classroom_schedule_slots s
        WHERE s.classroom_id = c.id
          AND p_reference_time >= s.slot_start
          AND p_reference_time < s.slot_end
          AND s.offsite_marked_at IS NULL
          AND s.session_status = 'SCHEDULED'
      ) THEN 'scheduled'
      ELSE 'available'
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7) Archive completed/offsite sessions once.
CREATE OR REPLACE FUNCTION archive_completed_sessions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_status IN ('SESSION_COMPLETED', 'OFFSITE') AND
     (OLD.session_status IS DISTINCT FROM NEW.session_status) THEN
    INSERT INTO classroom_session_logs (
      schedule_slot_id,
      classroom_id,
      teacher_user_id,
      teacher_name,
      department,
      section,
      session_start,
      session_end,
      session_status,
      attendance_ref,
      offsite_flag,
      archived_at
    )
    VALUES (
      NEW.id,
      NEW.classroom_id,
      NEW.teacher_user_id,
      (SELECT name FROM admins WHERE user_id = NEW.teacher_user_id LIMIT 1),
      NEW.department,
      NEW.section,
      NEW.slot_start,
      NEW.slot_end,
      NEW.session_status,
      NEW.attendance_url,
      (NEW.session_status = 'OFFSITE'),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_archive_completed_sessions ON classroom_schedule_slots;
CREATE TRIGGER trg_archive_completed_sessions
AFTER UPDATE ON classroom_schedule_slots
FOR EACH ROW
EXECUTE FUNCTION archive_completed_sessions();
