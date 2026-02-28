-- Add battle-specific columns to llm_scans
ALTER TABLE public.llm_scans
ADD COLUMN IF NOT EXISTS winner TEXT,
ADD COLUMN IF NOT EXISTS winner_reason TEXT;
