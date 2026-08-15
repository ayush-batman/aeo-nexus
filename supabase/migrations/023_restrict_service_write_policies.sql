-- 023: Close a cross-tenant write hole in the RLS policies.
--
-- Several feature tables shipped with write policies named "service role
-- writes/inserts/deletes ..." but declared as:
--
--     FOR INSERT WITH CHECK (true)
--     FOR DELETE USING (true)
--
-- with no `TO service_role` clause. In Postgres a policy with no role list
-- applies to PUBLIC — i.e. every `authenticated` user, not just the service
-- role. The name described the intent; the SQL did the opposite.
--
-- Impact (confidentiality was fine — SELECT policies are correctly
-- workspace-scoped — but integrity was not):
--   * Any logged-in user, using the browser anon-key client, could INSERT
--     fabricated rows into ANY workspace's accuracy_claims,
--     competitor_attributes, sentiment_drift_snapshots or notifications.
--   * Any logged-in user could DELETE ANY tenant's accuracy_claims and
--     competitor_attributes rows — destructive, cross-tenant.
--
-- These tables are written ONLY by server code using the service-role client
-- (lib/analytics/*.ts, lib/alerts/evaluate.ts, the cron routes — all via
-- createAdminClient()). The service role BYPASSES RLS entirely, so it does not
-- need — and never needed — a permissive policy to write. The correct state is
-- simply "no write policy for user roles", which makes RLS default-deny writes
-- from the anon/authenticated client while server writes continue to work.
--
-- So: drop the permissive write policies. SELECT (workspace-scoped) and the
-- user-facing notifications UPDATE (mark-as-read) policies are untouched.
--
-- NOTE: the `organizations` INSERT-with-check(true) policy from migration 003
-- is deliberately LEFT IN PLACE — org creation legitimately runs on the user
-- client at first sign-in (see getCurrentWorkspaceContext), and a user only
-- ever creates an org linked to themselves.

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "service role writes drift snapshots" ON public.sentiment_drift_snapshots;
DROP POLICY IF EXISTS "service role writes competitor attributes" ON public.competitor_attributes;
DROP POLICY IF EXISTS "service role deletes competitor attributes" ON public.competitor_attributes;
DROP POLICY IF EXISTS "service role writes accuracy claims" ON public.accuracy_claims;
DROP POLICY IF EXISTS "service role deletes accuracy claims" ON public.accuracy_claims;
