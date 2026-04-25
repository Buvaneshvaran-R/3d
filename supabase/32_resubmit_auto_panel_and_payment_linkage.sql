-- ============================================
-- PRINT JOBS: Resubmit linkage fields (student auto flow)
-- ============================================

ALTER TABLE print_jobs
ADD COLUMN IF NOT EXISTS original_job_id UUID REFERENCES print_jobs(id),
ADD COLUMN IF NOT EXISTS carried_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS additional_paid NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS resubmitted_as UUID REFERENCES print_jobs(id);

-- Backfill for existing paid records.
UPDATE print_jobs
SET amount_paid = COALESCE(amount_paid, amount)
WHERE amount_paid IS NULL;

UPDATE print_jobs
SET carried_amount = COALESCE(carried_amount, held_amount, amount, 0)
WHERE carried_amount IS NULL;

-- Recreate payment-confirm RPC so payment confirmation is the single place
-- where PRN IDs are assigned for normal submissions.
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
        job_code = v_code,
        carried_amount = COALESCE(carried_amount, 0),
        additional_paid = COALESCE(additional_paid, amount, 0),
        amount_paid = COALESCE(amount_paid, amount, 0)
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

COMMENT ON COLUMN print_jobs.original_job_id IS 'Original rejected print job UUID from which this new resubmitted job was created.';
COMMENT ON COLUMN print_jobs.carried_amount IS 'Amount carried from original payment into a resubmitted job.';
COMMENT ON COLUMN print_jobs.additional_paid IS 'Extra amount paid during resubmission when updated options cost more.';
COMMENT ON COLUMN print_jobs.amount_paid IS 'Total paid for this job after carried + additional amount.';
COMMENT ON COLUMN print_jobs.resubmitted_as IS 'For rejected/original rows, points to the new resubmitted job UUID.';
