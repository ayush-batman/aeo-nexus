-- 030: Turn interventions into the durable team Actions queue.
-- Additive columns keep every existing intervention and public API shape valid.

ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hypothesis text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS target_engines text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS insight_key text;

ALTER TABLE public.interventions
  DROP CONSTRAINT IF EXISTS interventions_priority_check;
ALTER TABLE public.interventions
  ADD CONSTRAINT interventions_priority_check CHECK (priority IN ('high', 'medium', 'low'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_interventions_workspace_insight_key
  ON public.interventions(workspace_id, insight_key)
  WHERE insight_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.action_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('created', 'updated', 'status_changed', 'measured')),
  from_status text,
  to_status text,
  changes jsonb NOT NULL DEFAULT '{}',
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(action_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_action_events_action_created
  ON public.action_events(action_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_events_workspace_created
  ON public.action_events(workspace_id, created_at DESC);

ALTER TABLE public.action_events ENABLE ROW LEVEL SECURITY;

-- Authenticated clients may read their organization's queue and audit trail.
-- Mutations continue through validated server routes using the service role.
DROP POLICY IF EXISTS "interventions_workspace_scoped" ON public.interventions;
DROP POLICY IF EXISTS "Members can read team actions" ON public.interventions;
CREATE POLICY "Members can read team actions"
  ON public.interventions FOR SELECT
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w
      JOIN public.users u ON u.org_id = w.org_id
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can read action events" ON public.action_events;
CREATE POLICY "Members can read action events"
  ON public.action_events FOR SELECT
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w
      JOIN public.users u ON u.org_id = w.org_id
      WHERE u.id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.interventions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.action_events FROM authenticated;
