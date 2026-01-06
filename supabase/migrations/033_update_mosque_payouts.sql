-- Add subscription_id and payout_date columns to mosque_payouts
ALTER TABLE public.mosque_payouts
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS payout_date DATE;

-- Create index for subscription_id
CREATE INDEX IF NOT EXISTS idx_mosque_payouts_subscription_id ON public.mosque_payouts(subscription_id);

-- Update status constraint to include 'paid'
ALTER TABLE public.mosque_payouts 
DROP CONSTRAINT IF EXISTS mosque_payouts_status_check;

ALTER TABLE public.mosque_payouts
ADD CONSTRAINT mosque_payouts_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'paid', 'failed', 'cancelled'));

-- Update existing 'completed' records to 'paid'
UPDATE public.mosque_payouts
SET status = 'paid',
    payout_date = COALESCE(processed_at::DATE, created_at::DATE)
WHERE status = 'completed';

-- Add comments
COMMENT ON COLUMN public.mosque_payouts.subscription_id IS 'Reference to the subscription that generated this payout';
COMMENT ON COLUMN public.mosque_payouts.payout_date IS 'Date when the payout was successfully transferred';

