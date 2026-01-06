-- Backfill subscription_id for existing mosque_payouts records
-- The subscription_id is stored in the affiliate_breakdown JSON
-- Only update if the subscription exists in the subscriptions table

-- For businesses
UPDATE public.mosque_payouts mp
SET subscription_id = (affiliate_breakdown->'businesses'->0->>'id')::uuid
WHERE subscription_id IS NULL
AND affiliate_breakdown->'businesses' IS NOT NULL
AND jsonb_array_length(affiliate_breakdown->'businesses') > 0
AND EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE s.id = (affiliate_breakdown->'businesses'->0->>'id')::uuid
);

-- For coupons
UPDATE public.mosque_payouts mp
SET subscription_id = (affiliate_breakdown->'coupons'->0->>'id')::uuid
WHERE subscription_id IS NULL
AND affiliate_breakdown->'coupons' IS NOT NULL
AND jsonb_array_length(affiliate_breakdown->'coupons') > 0
AND EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE s.id = (affiliate_breakdown->'coupons'->0->>'id')::uuid
);

-- For nonprofits
UPDATE public.mosque_payouts mp
SET subscription_id = (affiliate_breakdown->'nonprofits'->0->>'id')::uuid
WHERE subscription_id IS NULL
AND affiliate_breakdown->'nonprofits' IS NOT NULL
AND jsonb_array_length(affiliate_breakdown->'nonprofits') > 0
AND EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE s.id = (affiliate_breakdown->'nonprofits'->0->>'id')::uuid
);

-- Delete orphaned payout records that reference non-existent subscriptions
DELETE FROM public.mosque_payouts mp
WHERE subscription_id IS NULL
AND (
  (affiliate_breakdown->'businesses' IS NOT NULL AND 
   jsonb_array_length(affiliate_breakdown->'businesses') > 0 AND
   NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = (affiliate_breakdown->'businesses'->0->>'id')::uuid))
  OR
  (affiliate_breakdown->'coupons' IS NOT NULL AND 
   jsonb_array_length(affiliate_breakdown->'coupons') > 0 AND
   NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = (affiliate_breakdown->'coupons'->0->>'id')::uuid))
  OR
  (affiliate_breakdown->'nonprofits' IS NOT NULL AND 
   jsonb_array_length(affiliate_breakdown->'nonprofits') > 0 AND
   NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = (affiliate_breakdown->'nonprofits'->0->>'id')::uuid))
);

-- Verify the backfill
SELECT 
  COUNT(*) as total_payouts,
  COUNT(subscription_id) as payouts_with_subscription_id,
  COUNT(*) - COUNT(subscription_id) as payouts_missing_subscription_id
FROM public.mosque_payouts;

