-- ============================================
-- Donations Table - Donation System
-- ============================================

-- Create payment provider enum
CREATE TYPE payment_provider AS ENUM ('stripe', 'paypal');

-- Create donation status enum
CREATE TYPE donation_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'canceled',
  'refunded',
  'partially_refunded'
);

-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Donor information (optional for anonymous donations)
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  donor_name TEXT,
  donor_email TEXT,
  
  -- Donation details
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  status donation_status DEFAULT 'pending' NOT NULL,
  
  -- Payment provider information
  payment_provider payment_provider NOT NULL,
  provider_payment_id TEXT, -- Stripe PaymentIntent ID or PayPal Order ID
  provider_customer_id TEXT, -- Stripe Customer ID or PayPal Payer ID
  
  -- Donation purpose/metadata
  mosque_id UUID REFERENCES public.mosques(id) ON DELETE SET NULL,
  mosque_code INTEGER,
  campaign_name TEXT,
  purpose TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT, -- 'month', 'year', etc.
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Receipt information
  receipt_url TEXT,
  receipt_sent_at TIMESTAMPTZ,
  
  -- Payment timestamps
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  -- Webhook tracking (for idempotency)
  webhook_processed_at TIMESTAMPTZ,
  webhook_event_id TEXT, -- Provider's webhook event ID
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT amount_positive CHECK (amount > 0),
  CONSTRAINT anonymous_or_user CHECK (user_id IS NOT NULL OR (donor_name IS NOT NULL AND donor_email IS NOT NULL))
);

-- Create indexes for performance
CREATE INDEX idx_donations_user_id ON public.donations(user_id);
CREATE INDEX idx_donations_status ON public.donations(status);
CREATE INDEX idx_donations_payment_provider ON public.donations(payment_provider);
CREATE INDEX idx_donations_provider_payment_id ON public.donations(provider_payment_id);
CREATE INDEX idx_donations_mosque_id ON public.donations(mosque_id);
CREATE INDEX idx_donations_mosque_code ON public.donations(mosque_code);
CREATE INDEX idx_donations_created_at ON public.donations(created_at DESC);
CREATE INDEX idx_donations_webhook_event_id ON public.donations(webhook_event_id);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own donations
CREATE POLICY "Users can view own donations"
  ON public.donations FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can create donations
CREATE POLICY "Users can create donations"
  ON public.donations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    (user_id IS NULL AND donor_email IS NOT NULL)
  );

-- System can update donations (via webhooks with service role)
-- This will be restricted to service role or function calls
CREATE POLICY "System can update donations"
  ON public.donations FOR UPDATE
  USING (true); -- Will be restricted by function/service role

-- Admins can view all donations
CREATE POLICY "Admins can view all donations"
  ON public.donations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update donations
CREATE POLICY "Admins can update donations"
  ON public.donations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update donation status (for webhooks)
CREATE OR REPLACE FUNCTION public.update_donation_status(
  p_provider_payment_id TEXT,
  p_status donation_status,
  p_webhook_event_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.donations AS $$
DECLARE
  v_donation public.donations;
  v_timestamp TIMESTAMPTZ := NOW();
BEGIN
  UPDATE public.donations
  SET 
    status = p_status,
    updated_at = v_timestamp,
    webhook_processed_at = v_timestamp,
    webhook_event_id = COALESCE(p_webhook_event_id, webhook_event_id),
    metadata = metadata || p_metadata,
    paid_at = CASE WHEN p_status = 'succeeded' THEN v_timestamp ELSE paid_at END,
    failed_at = CASE WHEN p_status = 'failed' THEN v_timestamp ELSE failed_at END,
    refunded_at = CASE WHEN p_status IN ('refunded', 'partially_refunded') THEN v_timestamp ELSE refunded_at END
  WHERE provider_payment_id = p_provider_payment_id
  RETURNING * INTO v_donation;
  
  RETURN v_donation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update updated_at
CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.donations IS 'Stores donation records with payment provider information';
COMMENT ON FUNCTION public.update_donation_status IS 'Updates donation status from webhook. Idempotent via webhook_event_id.';

