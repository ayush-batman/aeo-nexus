-- 036: Durable, retryable initial measurements created atomically with workspaces.

CREATE TABLE IF NOT EXISTS public.measurement_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('initial_visibility')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'partial', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  available_at timestamptz NOT NULL DEFAULT now(),
  claim_token uuid,
  claim_expires_at timestamptz,
  last_error text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (workspace_id, purpose)
);

CREATE INDEX IF NOT EXISTS measurement_jobs_claim_idx
  ON public.measurement_jobs (available_at, claim_expires_at)
  WHERE status IN ('queued', 'running');

ALTER TABLE public.measurement_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read measurement jobs" ON public.measurement_jobs;
CREATE POLICY "Members can read measurement jobs"
  ON public.measurement_jobs FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );
REVOKE INSERT, UPDATE, DELETE ON public.measurement_jobs FROM authenticated;

CREATE OR REPLACE FUNCTION public.claim_measurement_jobs(
  p_limit integer DEFAULT 1,
  p_lease_seconds integer DEFAULT 240
) RETURNS TABLE (
  job_id uuid,
  workspace_id uuid,
  org_id uuid,
  purpose text,
  attempts integer,
  max_attempts integer,
  claim_token uuid,
  workspace_name text,
  workspace_settings jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit < 1 OR p_limit > 10 OR p_lease_seconds < 60 OR p_lease_seconds > 600 THEN
    RAISE EXCEPTION 'invalid measurement job claim bounds' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH due AS (
    SELECT job.id
    FROM public.measurement_jobs AS job
    WHERE job.attempts < job.max_attempts
      AND job.available_at <= now()
      AND (
        job.status = 'queued'
        OR (job.status = 'running' AND job.claim_expires_at <= now())
      )
    ORDER BY job.available_at, job.created_at, job.id
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ), claimed AS (
    UPDATE public.measurement_jobs AS job
    SET status = 'running',
        attempts = job.attempts + 1,
        claim_token = gen_random_uuid(),
        claim_expires_at = now() + make_interval(secs => p_lease_seconds),
        updated_at = now()
    FROM due
    WHERE job.id = due.id
    RETURNING job.*
  )
  SELECT
    claimed.id,
    claimed.workspace_id,
    claimed.org_id,
    claimed.purpose,
    claimed.attempts,
    claimed.max_attempts,
    claimed.claim_token,
    workspace.name,
    workspace.settings
  FROM claimed
  JOIN public.workspaces AS workspace ON workspace.id = claimed.workspace_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_measurement_job(
  p_job_id uuid,
  p_claim_token uuid,
  p_status text,
  p_result jsonb DEFAULT '{}'::jsonb,
  p_error text DEFAULT NULL,
  p_retry_delay_seconds integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempts integer;
  v_max_attempts integer;
BEGIN
  IF p_status NOT IN ('succeeded', 'partial', 'failed', 'skipped') THEN
    RAISE EXCEPTION 'invalid measurement job finish status';
  END IF;
  IF p_retry_delay_seconds < 0 OR p_retry_delay_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid measurement job retry delay';
  END IF;

  SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
  FROM public.measurement_jobs
  WHERE id = p_job_id AND claim_token = p_claim_token AND status = 'running'
  FOR UPDATE;
  IF v_attempts IS NULL THEN
    RETURN false;
  END IF;

  IF p_status = 'failed' AND v_attempts < v_max_attempts THEN
    UPDATE public.measurement_jobs
    SET status = 'queued',
        available_at = now() + make_interval(secs => p_retry_delay_seconds),
        claim_token = NULL,
        claim_expires_at = NULL,
        last_error = left(p_error, 2000),
        result = COALESCE(p_result, '{}'::jsonb),
        updated_at = now()
    WHERE id = p_job_id AND claim_token = p_claim_token;
  ELSE
    UPDATE public.measurement_jobs
    SET status = p_status,
        claim_token = NULL,
        claim_expires_at = NULL,
        last_error = left(p_error, 2000),
        result = COALESCE(p_result, '{}'::jsonb),
        updated_at = now(),
        completed_at = now()
    WHERE id = p_job_id AND claim_token = p_claim_token;
  END IF;

  RETURN true;
END;
$$;

-- Replace migration 034's creator so the workspace and its initial job commit together.
CREATE OR REPLACE FUNCTION public.create_workspace_with_plan_limit(
  p_org_id uuid,
  p_name text,
  p_settings jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan text;
  v_limit integer;
  v_count integer;
  v_workspace public.workspaces%ROWTYPE;
  v_job_id uuid;
BEGIN
  IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'invalid_workspace_name';
  END IF;
  IF p_settings IS NULL OR jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'invalid_workspace_settings';
  END IF;

  SELECT plan INTO v_plan
    FROM public.organizations
    WHERE id = p_org_id
    FOR UPDATE;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('status', 'organization_not_found');
  END IF;

  v_limit := CASE WHEN v_plan = 'free' THEN 1 ELSE NULL END;
  IF v_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.workspaces WHERE org_id = p_org_id;
    IF v_count >= v_limit THEN
      RETURN jsonb_build_object('status', 'denied', 'limit', v_limit);
    END IF;
  END IF;

  INSERT INTO public.workspaces (org_id, name, settings)
  VALUES (p_org_id, btrim(p_name), p_settings)
  RETURNING * INTO v_workspace;

  INSERT INTO public.measurement_jobs (workspace_id, org_id, purpose)
  VALUES (v_workspace.id, p_org_id, 'initial_visibility')
  ON CONFLICT (workspace_id, purpose) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_job_id;

  RETURN jsonb_build_object(
    'status', 'created',
    'workspace', to_jsonb(v_workspace),
    'measurement_job_id', v_job_id,
    'measurement_status', 'queued'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_measurement_jobs(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_measurement_job(uuid, uuid, text, jsonb, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_measurement_jobs(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_measurement_job(uuid, uuid, text, jsonb, text, integer) TO service_role;

COMMENT ON TABLE public.measurement_jobs IS
  'Durable initial visibility work; unique by workspace and purpose for idempotent enqueueing.';
