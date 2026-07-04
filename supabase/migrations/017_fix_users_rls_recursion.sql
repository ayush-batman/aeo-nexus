-- Fix: infinite recursion (42P17) in public.users RLS
--
-- Root cause: the "Super admins can view all users" policy contained a
--   SELECT ... FROM users u WHERE u.id = auth.uid() AND u.is_super_admin
-- subquery. Evaluating that subquery re-triggered RLS on public.users,
-- which re-triggered the policy — recursion.
--
-- Fix: extract the super-admin lookup into a SECURITY DEFINER function
-- (runs as the function owner, bypassing RLS on public.users), and have the
-- policy call the function instead of querying the table directly.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT is_super_admin FROM public.users WHERE id = auth.uid()),
        false
    );
$$;

-- Only server-side callers should be able to invoke this
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- Replace the recursive policy
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;
CREATE POLICY "Super admins can view all users"
    ON public.users
    FOR SELECT
    USING (public.is_super_admin());
