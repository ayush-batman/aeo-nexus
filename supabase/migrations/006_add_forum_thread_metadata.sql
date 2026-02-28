-- Add metadata columns for forum threads
ALTER TABLE public.forum_threads
ADD COLUMN IF NOT EXISTS author text,
ADD COLUMN IF NOT EXISTS discovered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS external_created_at timestamp with time zone;
