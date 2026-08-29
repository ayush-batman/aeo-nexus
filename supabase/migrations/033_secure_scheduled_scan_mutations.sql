-- 033: Scheduled provider work is mutated only through authorized server routes.
-- Organization members keep read access; direct browser writes are removed.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.scheduled_scans FROM authenticated;

-- Rollback mitigation: restore these grants only with role-aware RLS policies.
-- The current organization-wide policies do not distinguish viewers from editors.
