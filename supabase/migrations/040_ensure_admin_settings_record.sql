-- Migration: Ensure admin_settings has a default record
-- Date: 2026-01-08
-- Description: Inserts a default admin_settings record if none exists (using correct schema)

-- Insert default admin_settings record if table is empty
INSERT INTO public.admin_settings (
  id,
  platform_name,
  support_email,
  contact_phone,
  website_url,
  pricing_mosque,
  pricing_business,
  pricing_coupon,
  pricing_nonprofit,
  mosque_kickback_percentage,
  education_fund_percentage,
  notification_email,
  notify_new_subscription,
  notify_payment_failed,
  notify_subscription_cancelled,
  notify_push_requests,
  notify_member_updates
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid, -- id (fixed UUID for single row)
  'Amanah', -- platform_name
  'support@amanah.app', -- support_email
  '+1 (555) 123-4567', -- contact_phone
  'https://amanah.app', -- website_url
  100.00, -- pricing_mosque
  10.00, -- pricing_business
  10.00, -- pricing_coupon
  50.00, -- pricing_nonprofit
  10.00, -- mosque_kickback_percentage
  15.00, -- education_fund_percentage
  'josh@mobileappcity.com', -- notification_email
  true, -- notify_new_subscription
  true, -- notify_payment_failed
  true, -- notify_subscription_cancelled
  true, -- notify_push_requests
  true -- notify_member_updates
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_settings LIMIT 1
);

COMMENT ON COLUMN public.admin_settings.notify_member_updates IS 'Send notifications when members update their subscription details';

