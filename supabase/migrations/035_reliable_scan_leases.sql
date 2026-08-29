-- 035: Renew a single scheduled-scan lease immediately before bounded provider work.

CREATE OR REPLACE FUNCTION public.renew_scheduled_scan_claim(
  p_schedule_id uuid,
  p_claim_token uuid,
  p_lease_seconds integer DEFAULT 240
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_renewed_id uuid;
BEGIN
  IF p_lease_seconds < 60 OR p_lease_seconds > 600 THEN
    RAISE EXCEPTION 'invalid scheduled scan lease bound' USING ERRCODE = '22023';
  END IF;

  UPDATE public.scheduled_scans
  SET claim_expires_at = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
  WHERE id = p_schedule_id
    AND claim_token = p_claim_token
    AND status = 'active'
  RETURNING id INTO v_renewed_id;

  RETURN v_renewed_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.renew_scheduled_scan_claim(uuid, uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_scheduled_scan_claim(uuid, uuid, integer)
  TO service_role;

COMMENT ON FUNCTION public.renew_scheduled_scan_claim(uuid, uuid, integer) IS
  'Service-role-only lease renewal bound to the exact scheduled scan claim token.';
