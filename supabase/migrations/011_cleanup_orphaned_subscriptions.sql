-- Clean up orphaned subscriptions that don't have associated entity records
-- These are subscriptions where the subscription was created but the entity creation failed

-- Delete orphaned mosque subscriptions
DELETE FROM public.subscriptions
WHERE type = 'mosque'
AND id NOT IN (
  SELECT subscription_id FROM public.mosques WHERE subscription_id IS NOT NULL
);

-- Delete orphaned business subscriptions
DELETE FROM public.subscriptions
WHERE type = 'business'
AND id NOT IN (
  SELECT subscription_id FROM public.businesses WHERE subscription_id IS NOT NULL
);

-- Delete orphaned coupon subscriptions
DELETE FROM public.subscriptions
WHERE type = 'coupon'
AND id NOT IN (
  SELECT subscription_id FROM public.coupons WHERE subscription_id IS NOT NULL
);

-- Delete orphaned nonprofit subscriptions
DELETE FROM public.subscriptions
WHERE type = 'nonprofit'
AND id NOT IN (
  SELECT subscription_id FROM public.nonprofits WHERE subscription_id IS NOT NULL
);

-- Add a comment
COMMENT ON TABLE public.subscriptions IS 'Subscriptions table - entries should always have corresponding entity records (mosques, businesses, coupons, or nonprofits)';

