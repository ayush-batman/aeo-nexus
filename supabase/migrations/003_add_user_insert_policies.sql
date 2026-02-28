-- Migration: Add INSERT policies for user self-registration
-- This allows users to create their own profile and related records

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can create own profile"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow authenticated users to create an organization
CREATE POLICY "Users can create organization"
  ON public.organizations FOR INSERT
  WITH CHECK (true);  -- Any authenticated user can create an org

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- Allow org owners to create workspaces
CREATE POLICY "Users can create workspace in their org"
  ON public.workspaces FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid() AND role = 'owner'));
