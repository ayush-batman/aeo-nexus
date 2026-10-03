-- 025: Keep tenant identity, privileges, and billing entitlements server-owned.
--
-- Existing policies allowed an authenticated user to UPDATE their complete
-- public.users row and allowed an owner to UPDATE their complete organization
-- row. RLS decides which rows are writable; it does not restrict columns.
-- This migration therefore combines column grants, row checks, and triggers.

BEGIN;

-- Remove duplicate/legacy versions before installing one explicit policy.
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Owners can update org" ON public.organizations;
CREATE POLICY "Owners can update org"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT org_id
      FROM public.users
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT org_id
      FROM public.users
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Supabase normally grants table-level UPDATE to authenticated. Revoke that
-- broad capability, then allow only the fields used by the current UI/routes.
REVOKE UPDATE ON TABLE public.users FROM anon, authenticated;
GRANT UPDATE (full_name, avatar_url, onboarding_completed)
  ON TABLE public.users TO authenticated;

REVOKE UPDATE ON TABLE public.organizations FROM anon, authenticated;
GRANT UPDATE (name)
  ON TABLE public.organizations TO authenticated;

-- Defense in depth: if a future migration accidentally restores a broad
-- table grant, JWT-authenticated requests still cannot change authority.
CREATE OR REPLACE FUNCTION public.guard_user_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IN ('anon', 'authenticated') AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.email IS DISTINCT FROM OLD.email OR
    NEW.org_id IS DISTINCT FROM OLD.org_id OR
    NEW.role IS DISTINCT FROM OLD.role OR
    NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
  ) THEN
    RAISE EXCEPTION 'tenant identity and privilege fields are server-owned'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_sensitive_fields ON public.users;
CREATE TRIGGER guard_user_sensitive_fields
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_sensitive_fields();

CREATE OR REPLACE FUNCTION public.guard_organization_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IN ('anon', 'authenticated') AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.plan IS DISTINCT FROM OLD.plan OR
    NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id OR
    NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id OR
    NEW.razorpay_subscription_id IS DISTINCT FROM OLD.razorpay_subscription_id
  ) THEN
    RAISE EXCEPTION 'billing and entitlement fields are server-owned'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_organization_billing_fields ON public.organizations;
CREATE TRIGGER guard_organization_billing_fields
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_organization_billing_fields();

COMMIT;

-- Deployment audit (run read-only before and after applying this migration):
-- SELECT id, email, org_id, role, is_super_admin FROM public.users
-- WHERE is_super_admin OR role <> 'owner';
-- SELECT id, name, plan, stripe_customer_id, stripe_subscription_id,
--        razorpay_subscription_id FROM public.organizations;
--
-- Rollback mitigation (do not use unless the new safe profile/org update paths
-- are demonstrably broken): drop the two triggers/functions, revoke the column
-- grants, and restore table UPDATE grants. Restoring broad grants reopens the
-- original vulnerability, so the preferred rollback is to fix the allowlist.
