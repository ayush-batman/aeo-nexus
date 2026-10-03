-- 027: Serialize weekly measurement-run quota reservations per organization.

BEGIN;

CREATE TABLE IF NOT EXISTS public.scan_quota_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  units integer NOT NULL DEFAULT 1 CHECK (units > 0 AND units <= 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, request_id)
);

CREATE INDEX IF NOT EXISTS scan_quota_reservations_org_created_idx
  ON public.scan_quota_reservations (org_id, created_at DESC);

ALTER TABLE public.scan_quota_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.scan_quota_reservations FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_scan_quota(
  p_org_id uuid,
  p_request_id text,
  p_units integer DEFAULT 1
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_plan text;
  weekly_limit integer;
  used_units bigint;
BEGIN
  IF length(trim(p_request_id)) = 0 OR length(p_request_id) > 160 THEN
    RAISE EXCEPTION 'invalid scan request identity' USING ERRCODE = '22023';
  END IF;
  IF p_units <= 0 OR p_units > 8 THEN
    RAISE EXCEPTION 'invalid scan quota units' USING ERRCODE = '22023';
  END IF;

  -- The row lock makes concurrent reservations for one organization observe
  -- one ordered usage total instead of racing past the limit.
  SELECT plan INTO current_plan
  FROM public.organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'scan organization does not exist' USING ERRCODE = 'P0002';
  END IF;
  IF current_plan NOT IN ('free', 'starter', 'pro', 'agency', 'enterprise') THEN
    RAISE EXCEPTION 'unsupported organization plan' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.scan_quota_reservations
    WHERE org_id = p_org_id AND request_id = p_request_id
  ) THEN
    RETURN 'duplicate';
  END IF;

  weekly_limit := CASE WHEN current_plan = 'free' THEN 3 ELSE NULL END;
  IF weekly_limit IS NOT NULL THEN
    SELECT COALESCE(sum(units), 0) INTO used_units
    FROM public.scan_quota_reservations
    WHERE org_id = p_org_id
      AND created_at >= now() - interval '7 days';

    IF used_units + p_units > weekly_limit THEN
      RETURN 'denied';
    END IF;
  END IF;

  INSERT INTO public.scan_quota_reservations (org_id, request_id, units)
  VALUES (p_org_id, p_request_id, p_units);
  RETURN 'reserved';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_scan_quota(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_scan_quota(uuid, text, integer)
  TO service_role;

COMMIT;

-- Rollback/mitigation: keep the reservation table as an audit record. If the
-- RPC must be disabled, revoke service_role execution before changing callers.
