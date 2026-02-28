-- Migration: Add RLS policies for super admins
-- Run this in Supabase SQL Editor after the base schema

-- Super admins can view all organizations
CREATE POLICY "Super admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_super_admin = true
    )
  );

-- Super admins can view all users
CREATE POLICY "Super admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.is_super_admin = true
    )
  );

-- Super admins can view all workspaces
CREATE POLICY "Super admins can view all workspaces"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_super_admin = true
    )
  );

-- Super admins can view all LLM scans
CREATE POLICY "Super admins can view all llm_scans"
  ON public.llm_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_super_admin = true
    )
  );

-- Super admins can view all forum threads
CREATE POLICY "Super admins can view all forum_threads"
  ON public.forum_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_super_admin = true
    )
  );

-- Super admins can view all content analyses
CREATE POLICY "Super admins can view all content_analyses"
  ON public.content_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_super_admin = true
    )
  );
