-- Create subscription type enum
CREATE TYPE subscription_type AS ENUM ('mosque', 'business', 'coupon', 'nonprofit');

-- Create subscription status enum
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'unpaid', 'paused');

-- Create app status enum
CREATE TYPE app_status AS ENUM ('pending_verification', 'active', 'removed', 'cancelled', 'update_pending');

-- Subscriptions table (tracks payment and billing)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type subscription_type NOT NULL,
  status subscription_status DEFAULT 'active' NOT NULL,
  app_status app_status DEFAULT 'pending_verification' NOT NULL,
  
  -- Stripe fields
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  
  -- Pricing
  price_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'usd' NOT NULL,
  
  -- Billing dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  
  -- App listing status
  added_to_app BOOLEAN DEFAULT FALSE,
  added_to_app_date TIMESTAMPTZ,
  removed_from_app_date TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  cancelled_at TIMESTAMPTZ
);

-- Coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Mosque affiliation
  affiliated_mosque_code INTEGER REFERENCES public.mosques(mosque_code) ON DELETE SET NULL,
  
  -- Basic info
  title TEXT NOT NULL,
  merchant TEXT NOT NULL,
  description TEXT NOT NULL,
  thumbnail_description TEXT,
  pop_up_text TEXT,
  
  -- Contact
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  address TEXT NOT NULL,
  
  -- Redemption limits
  redeem_limit INTEGER,
  user_redeem_limit INTEGER,
  user_monthly_redeem_limit INTEGER,
  user_weekly_redeem_limit INTEGER,
  
  -- Discount details
  discount_amount TEXT,
  discount_percentage TEXT,
  coupon_code TEXT,
  redeem_code TEXT,
  prefix TEXT,
  next_no TEXT,
  
  -- Validity
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Media
  photos TEXT[],
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'expired', 'rejected')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Nonprofits table
CREATE TABLE public.nonprofits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic info
  name TEXT NOT NULL,
  about TEXT NOT NULL,
  
  -- Contact
  address TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  website TEXT,
  
  -- Links
  donate_link TEXT,
  social_media JSONB,
  
  -- Media
  logo TEXT,
  photos TEXT[],
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Update existing mosques table to include subscription reference
ALTER TABLE public.mosques
ADD COLUMN subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- Update existing businesses table to include subscription reference
ALTER TABLE public.businesses
ADD COLUMN subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_type ON public.subscriptions(type);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_next_billing_date ON public.subscriptions(next_billing_date);

CREATE INDEX idx_coupons_user_id ON public.coupons(user_id);
CREATE INDEX idx_coupons_subscription_id ON public.coupons(subscription_id);
CREATE INDEX idx_coupons_affiliated_mosque_code ON public.coupons(affiliated_mosque_code);
CREATE INDEX idx_coupons_status ON public.coupons(status);
CREATE INDEX idx_coupons_start_date ON public.coupons(start_date);
CREATE INDEX idx_coupons_end_date ON public.coupons(end_date);

CREATE INDEX idx_nonprofits_user_id ON public.nonprofits(user_id);
CREATE INDEX idx_nonprofits_subscription_id ON public.nonprofits(subscription_id);
CREATE INDEX idx_nonprofits_status ON public.nonprofits(status);

-- Create triggers to update updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nonprofits_updated_at BEFORE UPDATE ON public.nonprofits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate mosque kickback for a subscription
CREATE OR REPLACE FUNCTION calculate_mosque_kickback(
  subscription_type_param subscription_type,
  affiliated_mosque_code_param INTEGER,
  price_amount_param DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  -- Only business and coupon subscriptions provide kickbacks
  IF subscription_type_param IN ('business', 'coupon') AND affiliated_mosque_code_param IS NOT NULL THEN
    -- 10% kickback
    RETURN price_amount_param * 0.10;
  END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get active subscriptions for a user
CREATE OR REPLACE FUNCTION get_user_active_subscriptions(user_id_param UUID)
RETURNS TABLE (
  subscription_id UUID,
  type subscription_type,
  status subscription_status,
  price_amount DECIMAL,
  next_billing_date TIMESTAMPTZ,
  entity_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.type,
    s.status,
    s.price_amount,
    s.next_billing_date,
    CASE 
      WHEN s.type = 'mosque' THEN m.name
      WHEN s.type = 'business' THEN b.name
      WHEN s.type = 'coupon' THEN c.title
      WHEN s.type = 'nonprofit' THEN n.name
      ELSE 'Unknown'
    END as entity_name
  FROM public.subscriptions s
  LEFT JOIN public.mosques m ON s.id = m.subscription_id
  LEFT JOIN public.businesses b ON s.id = b.subscription_id
  LEFT JOIN public.coupons c ON s.id = c.subscription_id
  LEFT JOIN public.nonprofits n ON s.id = n.subscription_id
  WHERE s.user_id = user_id_param
    AND s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

