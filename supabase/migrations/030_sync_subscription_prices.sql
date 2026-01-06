-- Sync subscription prices from Stripe
-- This will help update any subscriptions where the price_amount doesn't match Stripe

-- Add a comment to explain the price_amount column
COMMENT ON COLUMN public.subscriptions.price_amount IS 'Monthly subscription price in dollars (not cents). Should match Stripe subscription amount.';

-- Note: To update existing subscription prices, you'll need to:
-- 1. Check the Stripe dashboard for actual subscription prices
-- 2. Run UPDATE queries manually for each subscription that needs updating
-- 
-- Example:
-- UPDATE public.subscriptions 
-- SET price_amount = 234 
-- WHERE id = 'subscription-id-here' AND type = 'nonprofit';
--
-- UPDATE public.subscriptions 
-- SET price_amount = 58 
-- WHERE id = 'subscription-id-here' AND type = 'coupon';
--
-- UPDATE public.subscriptions 
-- SET price_amount = 79 
-- WHERE id = 'subscription-id-here' AND type = 'business';

