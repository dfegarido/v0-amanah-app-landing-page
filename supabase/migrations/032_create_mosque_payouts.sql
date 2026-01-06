-- Create mosque payouts table to track kickback transfers
CREATE TABLE IF NOT EXISTS public.mosque_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id UUID NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  mosque_code INTEGER NOT NULL,
  stripe_account_id TEXT NOT NULL,
  stripe_transfer_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  affiliate_breakdown JSONB,
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_mosque_payouts_mosque_id ON public.mosque_payouts(mosque_id);
CREATE INDEX IF NOT EXISTS idx_mosque_payouts_mosque_code ON public.mosque_payouts(mosque_code);
CREATE INDEX IF NOT EXISTS idx_mosque_payouts_status ON public.mosque_payouts(status);
CREATE INDEX IF NOT EXISTS idx_mosque_payouts_period ON public.mosque_payouts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_mosque_payouts_stripe_transfer ON public.mosque_payouts(stripe_transfer_id);

-- Add comments
COMMENT ON TABLE public.mosque_payouts IS 'Tracks kickback transfers to mosque Stripe Connected Accounts';
COMMENT ON COLUMN public.mosque_payouts.amount IS 'Total kickback amount in dollars (not cents)';
COMMENT ON COLUMN public.mosque_payouts.affiliate_breakdown IS 'JSON breakdown of businesses, coupons, nonprofits contributing to this payout';
COMMENT ON COLUMN public.mosque_payouts.stripe_transfer_id IS 'Stripe Transfer ID (tr_xxx) for tracking';

-- Create RLS policies
ALTER TABLE public.mosque_payouts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own mosque payouts
CREATE POLICY "Users can view their own mosque payouts"
  ON public.mosque_payouts
  FOR SELECT
  TO authenticated
  USING (
    mosque_id IN (
      SELECT m.id FROM public.mosques m
      INNER JOIN public.subscriptions s ON s.id = m.subscription_id
      WHERE s.user_id = auth.uid()
    )
  );

-- Allow admins to manage all payouts
CREATE POLICY "Admins can manage all payouts"
  ON public.mosque_payouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

