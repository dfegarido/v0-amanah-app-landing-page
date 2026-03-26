-- Promo code system for making mosque/business subscriptions free or discounted

-- Promo type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promo_type') THEN
    CREATE TYPE promo_type AS ENUM ('free', 'fixed', 'percentage');
  END IF;
END
$$;

-- Applies to entity type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promo_applies_to') THEN
    CREATE TYPE promo_applies_to AS ENUM ('mosque', 'business');
  END IF;
END
$$;

-- Table: promo_codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Public code users type (e.g., RAMADANFREE)
  code TEXT NOT NULL UNIQUE,

  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  promo_type promo_type NOT NULL,

  -- Discount configuration (all values stored as cents/integers)
  fixed_amount_cents INTEGER,
  percentage_value INTEGER,

  applies_to promo_applies_to NOT NULL,

  -- Optional date windows; enable/disable independently
  use_start_date BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE,
  use_end_date BOOLEAN NOT NULL DEFAULT FALSE,
  end_date DATE,

  -- Limit unique users who can redeem/apply the promo code
  -- If NULL => unlimited redemptions
  max_users INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_enabled ON public.promo_codes(enabled);
CREATE INDEX IF NOT EXISTS idx_promo_codes_applies_to ON public.promo_codes(applies_to);

-- Table: promo_code_redemptions
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- The subscription created after applying the promo code
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

  -- At apply time, store the normal monthly price so dashboard can restore it after promo ends
  normal_price_cents INTEGER NOT NULL,

  -- Status of the redemption/apply attempt
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce "1:1 per promo" semantics:
-- one user can only redeem/apply a given promo code once
CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_code_redemptions_promo_user
  ON public.promo_code_redemptions(promo_code_id, user_id);

CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_user ON public.promo_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_promo ON public.promo_code_redemptions(promo_code_id);

-- RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Admin can manage promo codes
DROP POLICY IF EXISTS "Admins can view all promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can insert promo codes" ON public.promo_codes;

CREATE POLICY "Admins can view all promo codes"
  ON public.promo_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert promo codes"
  ON public.promo_codes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users can view promo codes they've redeemed (so the app can compute dashboard pricing)
DROP POLICY IF EXISTS "Users can view redeemed promo codes" ON public.promo_codes;
CREATE POLICY "Users can view redeemed promo codes"
  ON public.promo_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.promo_code_redemptions r
      WHERE r.promo_code_id = promo_codes.id
        AND r.user_id = auth.uid()
    )
  );

-- Users can view their own promo redemptions
DROP POLICY IF EXISTS "Users can view own promo redemptions" ON public.promo_code_redemptions;
CREATE POLICY "Users can view own promo redemptions"
  ON public.promo_code_redemptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own redemptions (MVP: usually inserted by server with service role)
DROP POLICY IF EXISTS "Users can insert own promo redemptions" ON public.promo_code_redemptions;
CREATE POLICY "Users can insert own promo redemptions"
  ON public.promo_code_redemptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

