-- Separate Stripe Customer ID for nonprofit listing subscriptions (dedicated AmanahUS / nonprofit Stripe account).
-- Platform subscriptions (mosque, business, coupon) continue using users.stripe_customer_id.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS stripe_customer_id_nonprofit TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id_nonprofit
ON public.users (stripe_customer_id_nonprofit)
WHERE stripe_customer_id_nonprofit IS NOT NULL;

COMMENT ON COLUMN public.users.stripe_customer_id_nonprofit IS
  'Stripe Customer ID on the nonprofit-only Stripe account (nonprofit listing subscriptions)';
