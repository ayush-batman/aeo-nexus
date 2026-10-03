-- 026: Apply provider billing events atomically and exactly once.

BEGIN;

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('stripe', 'razorpay')),
  event_id text NOT NULL,
  event_type text NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free', 'starter', 'pro', 'agency')),
  provider_subscription_id text,
  occurred_at timestamptz,
  applied_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: only the service-role webhook path writes or
-- reads this ledger. The function owns the insert + plan transition transaction.
REVOKE ALL ON TABLE public.billing_webhook_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_billing_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_org_id uuid,
  p_plan text,
  p_subscription_id text,
  p_occurred_at timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inserted_count integer;
  newer_event_exists boolean;
BEGIN
  IF p_provider NOT IN ('stripe', 'razorpay') THEN
    RAISE EXCEPTION 'unsupported billing provider' USING ERRCODE = '22023';
  END IF;
  IF p_plan NOT IN ('free', 'starter', 'pro', 'agency') THEN
    RAISE EXCEPTION 'unsupported billing plan' USING ERRCODE = '22023';
  END IF;
  IF length(trim(p_event_id)) = 0 OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'billing event identity is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.billing_webhook_events (
    provider,
    event_id,
    event_type,
    org_id,
    plan,
    provider_subscription_id,
    occurred_at
  ) VALUES (
    p_provider,
    p_event_id,
    p_event_type,
    p_org_id,
    p_plan,
    p_subscription_id,
    p_occurred_at
  )
  ON CONFLICT (provider, event_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN
    RETURN false;
  END IF;

  -- Stripe does not guarantee delivery order. Record every genuine event for
  -- audit, but do not let an older event overwrite a newer provider state.
  IF p_occurred_at IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.billing_webhook_events
      WHERE provider = p_provider
        AND org_id = p_org_id
        AND event_id <> p_event_id
        AND occurred_at > p_occurred_at
    ) INTO newer_event_exists;

    IF newer_event_exists THEN
      RETURN false;
    END IF;
  END IF;

  UPDATE public.organizations
  SET
    plan = p_plan,
    stripe_subscription_id = CASE
      WHEN p_provider = 'stripe' THEN p_subscription_id
      ELSE stripe_subscription_id
    END,
    razorpay_subscription_id = CASE
      WHEN p_provider = 'razorpay' THEN p_subscription_id
      ELSE razorpay_subscription_id
    END,
    updated_at = now()
  WHERE id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'billing organization does not exist' USING ERRCODE = 'P0002';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_billing_event(
  text, text, text, uuid, text, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_billing_event(
  text, text, text, uuid, text, text, timestamptz
) TO service_role;

COMMIT;

-- Rollback: keep this ledger even if webhook code is rolled back; it is an
-- audit/idempotency record. Disable new webhook delivery first. Dropping the
-- function/table before providers stop retrying can cause duplicate upgrades.
