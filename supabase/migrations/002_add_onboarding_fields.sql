-- Add onboarding_completed column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add razorpay_subscription_id to organizations (replacing stripe)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;
