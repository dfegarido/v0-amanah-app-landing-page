-- Coupon Redemption System Migration
-- This creates tables and functions for tracking coupon usage

-- Create redemption status enum
CREATE TYPE redemption_status AS ENUM ('pending', 'completed', 'cancelled', 'expired');

-- Create coupon_redemptions table
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  
  -- Redemption details
  redemption_code TEXT NOT NULL, -- Unique code for this redemption
  redeemed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status redemption_status DEFAULT 'completed' NOT NULL,
  
  -- Validation
  validated_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Business owner who validated
  validated_at TIMESTAMPTZ,
  validation_method TEXT, -- 'qr_code', 'manual_code', 'in_person'
  
  -- Location tracking (optional)
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  device_info JSONB,
  
  -- Notes
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_coupon_redemptions_coupon_id ON public.coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_user_id ON public.coupon_redemptions(user_id);
CREATE INDEX idx_coupon_redemptions_business_id ON public.coupon_redemptions(business_id);
CREATE INDEX idx_coupon_redemptions_redeemed_at ON public.coupon_redemptions(redeemed_at DESC);
CREATE INDEX idx_coupon_redemptions_status ON public.coupon_redemptions(status);
CREATE INDEX idx_coupon_redemptions_code ON public.coupon_redemptions(redemption_code);

-- Create coupon_analytics table for aggregated stats
CREATE TABLE public.coupon_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  
  -- Daily stats
  date DATE NOT NULL,
  total_views INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0, -- Users who saved/favorited
  total_redemptions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(coupon_id, date)
);

CREATE INDEX idx_coupon_analytics_coupon_date ON public.coupon_analytics(coupon_id, date DESC);

-- Create user_saved_coupons table for favorites
CREATE TABLE public.user_saved_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, coupon_id)
);

CREATE INDEX idx_user_saved_coupons_user ON public.user_saved_coupons(user_id);
CREATE INDEX idx_user_saved_coupons_coupon ON public.user_saved_coupons(coupon_id);

-- Add new columns to coupons table
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS qr_code_data TEXT, -- QR code content
ADD COLUMN IF NOT EXISTS redemption_count INTEGER DEFAULT 0, -- Total redemptions
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0, -- Total views
ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0; -- Total saves

-- Function to check if user can redeem coupon
CREATE OR REPLACE FUNCTION can_redeem_coupon(
  p_coupon_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_coupon RECORD;
  v_redemption_count INTEGER;
  v_start_date DATE;
BEGIN
  -- Get coupon details
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE id = p_coupon_id;

  -- Check if coupon exists and is active
  IF NOT FOUND OR v_coupon.status != 'active' THEN
    RETURN FALSE;
  END IF;

  -- Check if coupon has expired
  IF v_coupon.end_date < CURRENT_DATE THEN
    RETURN FALSE;
  END IF;

  -- Check if coupon hasn't started yet
  IF v_coupon.start_date > CURRENT_DATE THEN
    RETURN FALSE;
  END IF;

  -- If unlimited redemptions, allow
  IF v_coupon.redemption_type = 'unlimited' THEN
    RETURN TRUE;
  END IF;

  -- For limited redemptions, check the period
  -- Determine the start date for the period
  CASE v_coupon.redeem_period
    WHEN 'daily' THEN
      v_start_date := CURRENT_DATE;
    WHEN 'weekly' THEN
      v_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    WHEN 'monthly' THEN
      v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    WHEN 'yearly' THEN
      v_start_date := DATE_TRUNC('year', CURRENT_DATE)::DATE;
    ELSE
      v_start_date := CURRENT_DATE;
  END CASE;

  -- Count redemptions in the current period
  SELECT COUNT(*) INTO v_redemption_count
  FROM public.coupon_redemptions
  WHERE coupon_id = p_coupon_id
    AND user_id = p_user_id
    AND status = 'completed'
    AND redeemed_at >= v_start_date::TIMESTAMPTZ;

  -- Check if limit reached
  IF v_redemption_count >= v_coupon.redeem_limit THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unique redemption code
CREATE OR REPLACE FUNCTION generate_redemption_code() RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    v_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM public.coupon_redemptions WHERE redemption_code = v_code
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update coupon redemption count
CREATE OR REPLACE FUNCTION update_coupon_redemption_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
    UPDATE public.coupons
    SET redemption_count = redemption_count + 1,
        updated_at = NOW()
    WHERE id = NEW.coupon_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    UPDATE public.coupons
    SET redemption_count = redemption_count + 1,
        updated_at = NOW()
    WHERE id = NEW.coupon_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed' THEN
    UPDATE public.coupons
    SET redemption_count = GREATEST(redemption_count - 1, 0),
        updated_at = NOW()
    WHERE id = NEW.coupon_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'completed' THEN
    UPDATE public.coupons
    SET redemption_count = GREATEST(redemption_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.coupon_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coupon_redemption_count
AFTER INSERT OR UPDATE OR DELETE ON public.coupon_redemptions
FOR EACH ROW
EXECUTE FUNCTION update_coupon_redemption_count();

-- RLS Policies

-- Enable RLS
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_coupons ENABLE ROW LEVEL SECURITY;

-- coupon_redemptions policies
CREATE POLICY "Users can view their own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Coupon owners can view their coupon redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coupons c
      JOIN public.subscriptions s ON c.subscription_id = s.id
      WHERE c.id = coupon_redemptions.coupon_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create redemptions"
  ON public.coupon_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coupon owners can update redemptions (validation)"
  ON public.coupon_redemptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coupons c
      JOIN public.subscriptions s ON c.subscription_id = s.id
      WHERE c.id = coupon_redemptions.coupon_id
        AND s.user_id = auth.uid()
    )
  );

-- user_saved_coupons policies
CREATE POLICY "Users can manage their saved coupons"
  ON public.user_saved_coupons FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- coupon_analytics policies
CREATE POLICY "Coupon owners can view their analytics"
  ON public.coupon_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coupons c
      JOIN public.subscriptions s ON c.subscription_id = s.id
      WHERE c.id = coupon_analytics.coupon_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all analytics"
  ON public.coupon_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.coupon_redemptions IS 'Tracks all coupon redemptions by users';
COMMENT ON TABLE public.coupon_analytics IS 'Daily aggregated analytics for coupons';
COMMENT ON TABLE public.user_saved_coupons IS 'Users favorite/saved coupons';

