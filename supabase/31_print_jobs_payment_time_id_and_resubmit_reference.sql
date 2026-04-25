-- ============================================
-- PRINT JOBS: Payment-time ID generation + resubmit lineage
-- ID format: PRN-YYYYMMDD-XXXX (daily sequence)
-- ============================================

-- Add lineage fields for resubmission tracking.
ALTER TABLE print_jobs
ADD COLUMN IF NOT EXISTS job_code TEXT,
ADD COLUMN IF NOT EXISTS original_job_code TEXT,
ADD COLUMN IF NOT EXISTS source_job_id UUID REFERENCES print_jobs(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_print_jobs_job_code_unique
  ON print_jobs(job_code);

-- Job code must be generated at payment confirmation, not at upload.
DROP TRIGGER IF EXISTS trg_set_print_job_code ON print_jobs;
DROP FUNCTION IF EXISTS set_print_job_code();

-- Keep historical helper if present but ensure no automatic insert-time generation path is active.

-- Table to maintain a per-day running sequence.
CREATE TABLE IF NOT EXISTS print_job_code_sequences (
  code_date DATE PRIMARY KEY,
  last_seq INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Return next job code in format PRN-YYYYMMDD-XXXX.
CREATE OR REPLACE FUNCTION next_print_job_code(p_code_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq INT;
BEGIN
  INSERT INTO print_job_code_sequences (code_date, last_seq)
  VALUES (p_code_date, 0)
  ON CONFLICT (code_date) DO NOTHING;

  UPDATE print_job_code_sequences
  SET last_seq = last_seq + 1,
      updated_at = NOW()
  WHERE code_date = p_code_date
  RETURNING last_seq INTO v_seq;

  RETURN 'PRN-' || to_char(p_code_date, 'YYYYMMDD') || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

-- Confirm payment and assign job IDs atomically at payment time.
CREATE OR REPLACE FUNCTION confirm_print_payment(p_job_ids UUID[], p_payment_id TEXT)
RETURNS TABLE(id UUID, job_code TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id UUID;
  v_code TEXT;
BEGIN
  FOREACH v_job_id IN ARRAY p_job_ids LOOP
    v_code := next_print_job_code(CURRENT_DATE);

    UPDATE print_jobs
    SET status = 'queued',
        payment_id = p_payment_id,
        job_code = v_code
    WHERE print_jobs.id = v_job_id
      AND status = 'pending_payment'
    RETURNING print_jobs.id, print_jobs.job_code
    INTO id, job_code;

    IF FOUND THEN
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Ensure pending-payment rows do not hold a permanent print ID.
UPDATE print_jobs
SET job_code = NULL
WHERE status = 'pending_payment';

COMMENT ON COLUMN print_jobs.original_job_code IS 'Original paid print job code that this row resubmits from.';
COMMENT ON COLUMN print_jobs.source_job_id IS 'Original rejected print_jobs.id that this row was resubmitted from.';
COMMENT ON FUNCTION next_print_job_code(DATE) IS 'Generates the next PRN-YYYYMMDD-XXXX job ID.';
COMMENT ON FUNCTION confirm_print_payment(UUID[], TEXT) IS 'Moves pending_payment jobs to queued and assigns PRN job IDs at payment confirmation.';
