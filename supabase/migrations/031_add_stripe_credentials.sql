-- Add Stripe Connected Account columns to mosques table
ALTER TABLE public.mosques
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_type TEXT DEFAULT 'express',
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN public.mosques.stripe_account_id IS 'Stripe Connected Account ID (e.g., acct_xxx)';
COMMENT ON COLUMN public.mosques.stripe_account_type IS 'Type of Stripe account: standard, express, or custom';
COMMENT ON COLUMN public.mosques.stripe_onboarding_complete IS 'Whether the mosque has completed Stripe onboarding';
COMMENT ON COLUMN public.mosques.stripe_charges_enabled IS 'Whether the account can accept charges';
COMMENT ON COLUMN public.mosques.stripe_payouts_enabled IS 'Whether the account can receive payouts';
COMMENT ON COLUMN public.mosques.stripe_connected_at IS 'When the mosque connected their Stripe account';
COMMENT ON COLUMN public.mosques.stripe_details_submitted IS 'Whether required account details have been submitted';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mosques_stripe_account_id ON public.mosques(stripe_account_id);

