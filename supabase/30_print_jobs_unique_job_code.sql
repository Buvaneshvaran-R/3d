-- ============================================
-- PRINT JOBS: Unique human-friendly job code
-- Adds a dedicated unique job ID for tracking rejected jobs and resubmissions.
-- ============================================

ALTER TABLE print_jobs
ADD COLUMN IF NOT EXISTS job_code TEXT;

-- Generator function for print job code, e.g. PJ-2026-1A2B3C4D
CREATE OR REPLACE FUNCTION generate_print_job_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := 'PJ-' || to_char(NOW(), 'YYYY') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM print_jobs
      WHERE job_code = candidate
    );
  END LOOP;

  RETURN candidate;
END;
$$;

-- Fill existing rows that do not have a job code yet.
UPDATE print_jobs
SET job_code = generate_print_job_code()
WHERE job_code IS NULL OR btrim(job_code) = '';

-- Trigger to auto-set job_code on every new insert.
CREATE OR REPLACE FUNCTION set_print_job_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.job_code IS NULL OR btrim(NEW.job_code) = '' THEN
    NEW.job_code := generate_print_job_code();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_print_job_code ON print_jobs;
CREATE TRIGGER trg_set_print_job_code
BEFORE INSERT ON print_jobs
FOR EACH ROW
EXECUTE FUNCTION set_print_job_code();

-- Enforce uniqueness for all future and existing records.
CREATE UNIQUE INDEX IF NOT EXISTS idx_print_jobs_job_code_unique
  ON print_jobs(job_code);

COMMENT ON COLUMN print_jobs.job_code IS 'Unique human-friendly ID for print jobs. Used to identify rejected jobs for fix-and-resubmit flow.';
