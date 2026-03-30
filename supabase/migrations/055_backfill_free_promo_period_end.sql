-- Backfill FREE promo subscriptions so UI period metadata reflects benefit duration.
-- This updates existing rows created before benefit_months logic was applied.

UPDATE public.subscriptions s
SET
  current_period_end = (r.benefit_ends_on::timestamp + interval '1 day' - interval '1 millisecond'),
  next_billing_date = (r.benefit_ends_on::timestamp + interval '1 day' - interval '1 millisecond')
FROM public.promo_code_redemptions r
JOIN public.promo_codes p ON p.id = r.promo_code_id
WHERE s.id = r.subscription_id
  AND p.promo_type = 'free'
  AND r.benefit_ends_on IS NOT NULL
  AND s.stripe_subscription_id IS NULL;
