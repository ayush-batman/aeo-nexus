-- Alert settings are organization-wide. Members may read them, but only the
-- server route (after an owner/admin check) may mutate them with service role.

ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own alert preferences" ON public.alert_preferences;
DROP POLICY IF EXISTS "Workspace members can read alert preferences" ON public.alert_preferences;
CREATE POLICY "Workspace members can read alert preferences"
  ON public.alert_preferences FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w
      JOIN public.users u ON u.org_id = w.org_id
      WHERE u.id = (SELECT auth.uid())
    )
  );

REVOKE ALL ON TABLE public.alert_preferences FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.alert_preferences FROM authenticated;
GRANT SELECT ON TABLE public.alert_preferences TO authenticated;
