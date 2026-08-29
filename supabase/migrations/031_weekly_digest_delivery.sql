-- 031: One observable weekly decision digest delivery per workspace/week.

CREATE TABLE IF NOT EXISTS public.weekly_digest_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  status text NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
  item_count integer NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  recipient_count integer NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  last_error text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE(workspace_id, week_start)
);

ALTER TABLE public.weekly_digest_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read weekly digest deliveries" ON public.weekly_digest_deliveries;
CREATE POLICY "Members can read weekly digest deliveries"
  ON public.weekly_digest_deliveries FOR SELECT
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w
      JOIN public.users u ON u.org_id = w.org_id
      WHERE u.id = auth.uid()
    )
  );
REVOKE INSERT, UPDATE, DELETE ON public.weekly_digest_deliveries FROM authenticated;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_workspace_dedupe
  ON public.notifications(workspace_id, dedupe_key);

CREATE OR REPLACE FUNCTION public.claim_weekly_digest_delivery(
  p_workspace_id uuid,
  p_week_start date,
  p_item_count integer,
  p_recipient_count integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed boolean := false;
BEGIN
  INSERT INTO public.weekly_digest_deliveries (
    workspace_id, week_start, status, item_count, recipient_count
  ) VALUES (
    p_workspace_id, p_week_start, 'sending', p_item_count, p_recipient_count
  )
  ON CONFLICT (workspace_id, week_start) DO UPDATE
    SET status = 'sending', item_count = EXCLUDED.item_count,
        recipient_count = EXCLUDED.recipient_count, last_error = NULL,
        attempted_at = now()
    WHERE weekly_digest_deliveries.status = 'failed'
  RETURNING true INTO claimed;
  RETURN COALESCE(claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_weekly_digest_delivery(uuid, date, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_weekly_digest_delivery(uuid, date, integer, integer) TO service_role;
