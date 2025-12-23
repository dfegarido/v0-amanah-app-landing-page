-- Add Stripe customer ID to users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);

-- Add comment
COMMENT ON COLUMN public.users.stripe_customer_id IS 'Stripe customer ID for payment processing';
