-- 028: Lease due scheduled scans so concurrent cron workers cannot run one twice.

BEGIN;

ALTER TABLE public.scheduled_scans
  ADD COLUMN IF NOT EXISTS claim_token uuid,
  ADD COLUMN IF NOT EXISTS claim_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_run_status text;

UPDATE public.scheduled_scans
SET status = 'paused',
    last_run_status = 'invalid_no_platforms',
    updated_at = now()
WHERE cardinality(platforms) = 0;

ALTER TABLE public.scheduled_scans
  DROP CONSTRAINT IF EXISTS scheduled_scans_requires_platforms;
ALTER TABLE public.scheduled_scans
  ADD CONSTRAINT scheduled_scans_requires_platforms
  CHECK (cardinality(platforms) > 0);

CREATE INDEX IF NOT EXISTS scheduled_scans_due_claim_idx
  ON public.scheduled_scans (next_run_at, claim_expires_at)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.claim_due_scheduled_scans(
  p_limit integer DEFAULT 10,
  p_lease_seconds integer DEFAULT 300
)
RETURNS TABLE (
  schedule_id uuid,
  workspace_id uuid,
  workspace_name text,
  org_id uuid,
  prompt text,
  platforms text[],
  competitors text[],
  frequency text,
  scheduled_for timestamptz,
  claim_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit < 1 OR p_limit > 50 OR p_lease_seconds < 30 OR p_lease_seconds > 1800 THEN
    RAISE EXCEPTION 'invalid scheduled scan claim bounds' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH due AS (
    SELECT scheduled.id
    FROM public.scheduled_scans AS scheduled
    WHERE scheduled.status = 'active'
      AND scheduled.next_run_at <= now()
      AND (scheduled.claim_expires_at IS NULL OR scheduled.claim_expires_at <= now())
    ORDER BY scheduled.next_run_at, scheduled.id
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ), claimed AS (
    UPDATE public.scheduled_scans AS scheduled
    SET claim_token = gen_random_uuid(),
        claim_expires_at = now() + make_interval(secs => p_lease_seconds),
        updated_at = now()
    FROM due
    WHERE scheduled.id = due.id
    RETURNING scheduled.*
  )
  SELECT
    claimed.id,
    claimed.workspace_id,
    workspace.name,
    workspace.org_id,
    claimed.prompt,
    claimed.platforms,
    claimed.competitors,
    claimed.frequency,
    claimed.next_run_at,
    claimed.claim_token
  FROM claimed
  JOIN public.workspaces AS workspace ON workspace.id = claimed.workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_scheduled_scans(integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_scheduled_scans(integer, integer)
  TO service_role;

COMMIT;
