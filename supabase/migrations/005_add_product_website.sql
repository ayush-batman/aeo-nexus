-- Add website column to products for onboarding
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS website text;
