-- =====================================================
-- Allocation Template Upload Access Control
-- =====================================================

-- Ensure column exists to grant upload capability to only selected user(s).
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS can_upload_allocations BOOLEAN DEFAULT FALSE;

-- Enable RLS for allocation templates table.
ALTER TABLE classroom_allocation_templates ENABLE ROW LEVEL SECURITY;

-- Read policy for authenticated users.
DROP POLICY IF EXISTS "allocation templates readable by authenticated users" ON classroom_allocation_templates;
CREATE POLICY "allocation templates readable by authenticated users"
  ON classroom_allocation_templates FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insert policy only for flagged uploader(s).
DROP POLICY IF EXISTS "allocation templates insert by uploader" ON classroom_allocation_templates;
CREATE POLICY "allocation templates insert by uploader"
  ON classroom_allocation_templates FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id
      FROM admins
      WHERE can_upload_allocations = TRUE
        AND user_id IS NOT NULL
    )
  );

-- Update policy only for flagged uploader(s).
DROP POLICY IF EXISTS "allocation templates update by uploader" ON classroom_allocation_templates;
CREATE POLICY "allocation templates update by uploader"
  ON classroom_allocation_templates FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id
      FROM admins
      WHERE can_upload_allocations = TRUE
        AND user_id IS NOT NULL
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id
      FROM admins
      WHERE can_upload_allocations = TRUE
        AND user_id IS NOT NULL
    )
  );

-- Delete policy only for flagged uploader(s).
DROP POLICY IF EXISTS "allocation templates delete by uploader" ON classroom_allocation_templates;
CREATE POLICY "allocation templates delete by uploader"
  ON classroom_allocation_templates FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id
      FROM admins
      WHERE can_upload_allocations = TRUE
        AND user_id IS NOT NULL
    )
  );

-- Grant upload access to only one uploader email.
UPDATE admins
SET can_upload_allocations = FALSE
WHERE can_upload_allocations = TRUE;

UPDATE admins
SET can_upload_allocations = TRUE
WHERE lower(email) = lower('classroomadmin@gmail.com');
