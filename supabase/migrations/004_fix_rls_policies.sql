-- Migration: Fix RLS circular dependency for users table
-- This resolves the 401 error when accessing dashboard

-- Drop the problematic policy with circular reference
DROP POLICY IF EXISTS "Users can view own profile and org members" ON public.users;

-- Create separate policies to avoid circular dependency

-- 1. Allow users to view their own row (primary fix)
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

-- 2. Allow users to view org members (after self-lookup works)
CREATE POLICY "Users can view org members"
  ON public.users FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()));

-- 3. Allow users to insert their own profile (fallback creation)
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- 4. Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- 5. Allow authenticated users to create organizations
CREATE POLICY "Authenticated can create org"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Allow org owners to update their organization
CREATE POLICY "Owners can update org"
  ON public.organizations FOR UPDATE
  USING (id IN (SELECT org_id FROM public.users WHERE id = auth.uid() AND role = 'owner'));

-- 7. Allow org owners to create workspaces
CREATE POLICY "Owners can create workspace"
  ON public.workspaces FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid() AND role = 'owner')
  );
