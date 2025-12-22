-- ============================================
-- SIMPLE FIX: Since policies already exist
-- Just verify and test everything
-- ============================================

-- 1. Check if is_admin() function works
SELECT is_admin() as am_i_admin;
-- Should return: true (if you're logged in as admin)

-- 2. Check admin user role
SELECT email, role FROM public.users WHERE email = 'admin@gmail.com';
-- Should show: role = 'admin'

-- If role is NOT 'admin', fix it:
-- UPDATE public.users SET role = 'admin' WHERE email = 'admin@gmail.com';

-- 3. Test if you can read admin_settings
SELECT * FROM public.admin_settings;
-- Should return one row with settings

-- 4. If you get "no rows" or error, insert default settings
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
  notify_member_updates,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Amanah',
  'support@amanah.app',
  '+1 (555) 123-4567',
  'https://amanah.app',
  100.00,
  10.00,
  10.00,
  50.00,
  10.00,
  15.00,
  'josh@mobileappcity.com',
  true,
  true,
  true,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  platform_name = EXCLUDED.platform_name,
  support_email = EXCLUDED.support_email,
  updated_at = NOW();

-- 5. Verify settings exist
SELECT 
  'Settings exist' as check,
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END as status
FROM admin_settings;

-- 6. List all policies to see what exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as operation
FROM pg_policies
WHERE tablename = 'admin_settings'
ORDER BY policyname;

