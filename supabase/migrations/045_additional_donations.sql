-- Create additional_donations table to support multiple organization donations per subscription

CREATE TABLE IF NOT EXISTS public.additional_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  organization_type TEXT NOT NULL CHECK (organization_type IN ('mosque', 'nonprofit')),
  organization_id UUID NOT NULL,
  amount_per_month DECIMAL(10, 2) NOT NULL CHECK (amount_per_month >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_additional_donations_subscription_id 
  ON public.additional_donations(subscription_id);

CREATE INDEX IF NOT EXISTS idx_additional_donations_organization 
  ON public.additional_donations(organization_type, organization_id);

-- Add composite index for faster lookups
CREATE INDEX IF NOT EXISTS idx_additional_donations_subscription_org 
  ON public.additional_donations(subscription_id, organization_type, organization_id);

-- Enable Row Level Security
ALTER TABLE public.additional_donations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own additional donations" ON public.additional_donations;
DROP POLICY IF EXISTS "Users can insert their own additional donations" ON public.additional_donations;
DROP POLICY IF EXISTS "Users can update their own additional donations" ON public.additional_donations;
DROP POLICY IF EXISTS "Users can delete their own additional donations" ON public.additional_donations;
DROP POLICY IF EXISTS "Admins can view all additional donations" ON public.additional_donations;
DROP POLICY IF EXISTS "Admins can manage all additional donations" ON public.additional_donations;

-- Policy: Users can view their own donations
CREATE POLICY "Users can view their own additional donations"
  ON public.additional_donations
  FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own donations
CREATE POLICY "Users can insert their own additional donations"
  ON public.additional_donations
  FOR INSERT
  WITH CHECK (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own donations
CREATE POLICY "Users can update their own additional donations"
  ON public.additional_donations
  FOR UPDATE
  USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own donations
CREATE POLICY "Users can delete their own additional donations"
  ON public.additional_donations
  FOR DELETE
  USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can view all donations
CREATE POLICY "Admins can view all additional donations"
  ON public.additional_donations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can manage all donations
CREATE POLICY "Admins can manage all additional donations"
  ON public.additional_donations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comment to table
COMMENT ON TABLE public.additional_donations IS 'Stores additional monthly donations from subscriptions to mosques and nonprofits';

-- Add comments to columns
COMMENT ON COLUMN public.additional_donations.organization_type IS 'Type of organization: mosque or nonprofit';
COMMENT ON COLUMN public.additional_donations.organization_id IS 'UUID of the mosque or nonprofit being donated to';
COMMENT ON COLUMN public.additional_donations.amount_per_month IS 'Monthly donation amount in USD';

