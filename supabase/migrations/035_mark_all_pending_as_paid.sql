-- Mark all pending affiliate earnings as paid
-- This creates payout records for subscriptions that don't have them yet

-- For businesses
INSERT INTO public.mosque_payouts (
  mosque_id,
  mosque_code,
  subscription_id,
  stripe_account_id,
  amount,
  period_start,
  period_end,
  status,
  payout_date,
  affiliate_breakdown,
  processed_at
)
SELECT DISTINCT
  m.id as mosque_id,
  b.affiliated_mosque_code as mosque_code,
  s.id as subscription_id,
  m.stripe_account_id,
  (s.price_amount * 0.10) as amount,
  DATE_TRUNC('month', s.current_period_start)::DATE as period_start,
  DATE_TRUNC('month', s.current_period_end)::DATE as period_end,
  'paid' as status,
  CURRENT_DATE as payout_date,
  jsonb_build_object(
    'businesses', jsonb_build_array(
      jsonb_build_object(
        'id', s.id,
        'name', b.name,
        'amount', (s.price_amount * 0.10)
      )
    )
  ) as affiliate_breakdown,
  NOW() as processed_at
FROM public.businesses b
INNER JOIN public.subscriptions s ON s.id = b.subscription_id
INNER JOIN public.mosques m ON m.mosque_code = b.affiliated_mosque_code
WHERE b.affiliated_mosque_code IS NOT NULL
  AND s.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.mosque_payouts mp
    WHERE mp.subscription_id = s.id
    AND mp.status = 'paid'
  )
  AND m.stripe_account_id IS NOT NULL;

-- For coupons
INSERT INTO public.mosque_payouts (
  mosque_id,
  mosque_code,
  subscription_id,
  stripe_account_id,
  amount,
  period_start,
  period_end,
  status,
  payout_date,
  affiliate_breakdown,
  processed_at
)
SELECT DISTINCT
  m.id as mosque_id,
  c.affiliated_mosque_code as mosque_code,
  s.id as subscription_id,
  m.stripe_account_id,
  (s.price_amount * 0.10) as amount,
  DATE_TRUNC('month', s.current_period_start)::DATE as period_start,
  DATE_TRUNC('month', s.current_period_end)::DATE as period_end,
  'paid' as status,
  CURRENT_DATE as payout_date,
  jsonb_build_object(
    'coupons', jsonb_build_array(
      jsonb_build_object(
        'id', s.id,
        'name', c.title,
        'amount', (s.price_amount * 0.10)
      )
    )
  ) as affiliate_breakdown,
  NOW() as processed_at
FROM public.coupons c
INNER JOIN public.subscriptions s ON s.id = c.subscription_id
INNER JOIN public.mosques m ON m.mosque_code = c.affiliated_mosque_code
WHERE c.affiliated_mosque_code IS NOT NULL
  AND s.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.mosque_payouts mp
    WHERE mp.subscription_id = s.id
    AND mp.status = 'paid'
  )
  AND m.stripe_account_id IS NOT NULL;

-- For nonprofits
INSERT INTO public.mosque_payouts (
  mosque_id,
  mosque_code,
  subscription_id,
  stripe_account_id,
  amount,
  period_start,
  period_end,
  status,
  payout_date,
  affiliate_breakdown,
  processed_at
)
SELECT DISTINCT
  m.id as mosque_id,
  n.affiliated_mosque_code as mosque_code,
  s.id as subscription_id,
  m.stripe_account_id,
  (s.price_amount * 0.10) as amount,
  DATE_TRUNC('month', s.current_period_start)::DATE as period_start,
  DATE_TRUNC('month', s.current_period_end)::DATE as period_end,
  'paid' as status,
  CURRENT_DATE as payout_date,
  jsonb_build_object(
    'nonprofits', jsonb_build_array(
      jsonb_build_object(
        'id', s.id,
        'name', n.name,
        'amount', (s.price_amount * 0.10)
      )
    )
  ) as affiliate_breakdown,
  NOW() as processed_at
FROM public.nonprofits n
INNER JOIN public.subscriptions s ON s.id = n.subscription_id
INNER JOIN public.mosques m ON m.mosque_code = n.affiliated_mosque_code
WHERE n.affiliated_mosque_code IS NOT NULL
  AND s.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.mosque_payouts mp
    WHERE mp.subscription_id = s.id
    AND mp.status = 'paid'
  )
  AND m.stripe_account_id IS NOT NULL;

-- Verify the update
SELECT 
  'Total payouts created' as description,
  COUNT(*) as count
FROM public.mosque_payouts
WHERE status = 'paid'
  AND payout_date = CURRENT_DATE;

