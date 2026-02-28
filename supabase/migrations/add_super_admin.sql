-- Migration: Add super admin column to users table
-- Run this in Supabase SQL Editor if you already have the base schema

-- Add is_super_admin column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- Create index for faster super admin lookups
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON public.users(is_super_admin) WHERE is_super_admin = true;

-- Grant super admin access to your account (replace with your email)
-- UPDATE public.users SET is_super_admin = true WHERE email = 'your-email@example.com';
