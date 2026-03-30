-- Signup deadline (redeem-by) separate from subscription benefit duration after redemption

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS use_redeem_by_date BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS redeem_by_date DATE;

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS benefit_months INTEGER;

ALTER TABLE public.promo_code_redemptions
  ADD COLUMN IF NOT EXISTS benefit_ends_on DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promo_codes_benefit_months_positive'
  ) THEN
    ALTER TABLE public.promo_codes
      ADD CONSTRAINT promo_codes_benefit_months_positive
      CHECK (benefit_months IS NULL OR benefit_months >= 1);
  END IF;
END $$;

COMMENT ON COLUMN public.promo_codes.redeem_by_date IS
  'Last calendar day (inclusive) a customer may apply this code; separate from benefit_months.';

COMMENT ON COLUMN public.promo_codes.benefit_months IS
  'Months the promo applies after redemption; NULL uses legacy promo date window only.';

COMMENT ON COLUMN public.promo_code_redemptions.benefit_ends_on IS
  'Last day (inclusive) this redemption receives promo pricing; NULL uses legacy promo dates.';
