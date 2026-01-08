-- Migration: Create subscription_change_requests table
-- Date: 2026-01-08
-- Description: Stores pending change requests for subscriptions that require admin approval

-- Create change request status enum
CREATE TYPE change_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create subscription_change_requests table
CREATE TABLE IF NOT EXISTS public.subscription_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Subscription reference
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  subscription_type TEXT NOT NULL, -- 'mosque', 'business', 'coupon', 'nonprofit'
  
  -- Requester information
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Change data
  changes JSONB NOT NULL, -- The proposed changes (field name -> new value)
  previous_data JSONB, -- Snapshot of current data before changes (for comparison)
  
  -- Status
  status change_request_status DEFAULT 'pending' NOT NULL,
  
  -- Admin review
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_change_requests_subscription_id ON public.subscription_change_requests(subscription_id);
CREATE INDEX idx_change_requests_user_id ON public.subscription_change_requests(user_id);
CREATE INDEX idx_change_requests_status ON public.subscription_change_requests(status);
CREATE INDEX idx_change_requests_created_at ON public.subscription_change_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.subscription_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own change requests
CREATE POLICY "Users can view own change requests"
  ON public.subscription_change_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create change requests for their own subscriptions
CREATE POLICY "Users can create change requests"
  ON public.subscription_change_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.subscriptions 
      WHERE id = subscription_id AND user_id = auth.uid()
    )
  );

-- Admins can view all change requests
CREATE POLICY "Admins can view all change requests"
  ON public.subscription_change_requests FOR SELECT
  USING (is_admin());

-- Admins can update change requests (approve/reject)
CREATE POLICY "Admins can update change requests"
  ON public.subscription_change_requests FOR UPDATE
  USING (is_admin());

-- Trigger to update updated_at
CREATE TRIGGER update_change_requests_updated_at
  BEFORE UPDATE ON public.subscription_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.subscription_change_requests IS 'Stores pending change requests for subscriptions that require admin approval';
COMMENT ON COLUMN public.subscription_change_requests.changes IS 'JSONB object containing the proposed changes (field name -> new value)';
COMMENT ON COLUMN public.subscription_change_requests.previous_data IS 'Snapshot of data before changes for comparison';
COMMENT ON COLUMN public.subscription_change_requests.status IS 'Status of the change request: pending, approved, or rejected';

