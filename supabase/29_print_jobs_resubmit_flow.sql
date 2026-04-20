-- ============================================
-- PRINT JOBS: Fix-and-Resubmit support
-- Adds fields required for carrying paid amount when a job is rejected
-- ============================================

ALTER TABLE print_jobs
ADD COLUMN IF NOT EXISTS can_resubmit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS held_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS resubmit_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resubmitted_at TIMESTAMP WITH TIME ZONE;

-- Keep held amount aligned with the originally paid amount for existing records.
UPDATE print_jobs
SET held_amount = amount
WHERE held_amount IS NULL AND amount IS NOT NULL;

-- If older cancelled records had a rejection reason, make them eligible by default.
UPDATE print_jobs
SET can_resubmit = true,
    resubmit_deadline = COALESCE(resubmit_deadline, submitted_at + INTERVAL '24 hours')
WHERE status = 'cancelled'
  AND rejection_reason IS NOT NULL
  AND resubmitted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_print_jobs_resubmit_eligibility
  ON print_jobs (status, can_resubmit, resubmit_deadline)
  WHERE status = 'cancelled';

COMMENT ON COLUMN print_jobs.can_resubmit IS 'True when a cancelled/rejected job can be fixed and resubmitted with carried-forward payment.';
COMMENT ON COLUMN print_jobs.held_amount IS 'Original paid amount held for fix-and-resubmit flow.';
COMMENT ON COLUMN print_jobs.resubmit_deadline IS 'Deadline for student to resubmit before fallback refund/manual handling.';
COMMENT ON COLUMN print_jobs.resubmitted_at IS 'Timestamp when the rejected job was resubmitted and re-queued.';
