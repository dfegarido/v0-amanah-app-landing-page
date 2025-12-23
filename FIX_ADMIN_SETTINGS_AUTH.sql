-- ============================================
-- FIX: Admin Settings Authentication Issue
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: Verify the is_admin() function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'is_admin' 
AND routine_schema = 'public';

-- If you see no results, the function doesn't exist
-- Create it:

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- STEP 2: Make sure admin_settings table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'admin_settings';

-- If it doesn't exist, run the full migration 014
-- (See 014_admin_settings_table.sql)

-- STEP 3: Check RLS policies on admin_settings
SELECT tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'admin_settings';

-- Should see:
-- "Admins can view settings" (SELECT)
-- "Admins can update settings" (UPDATE)

-- If policies are missing, recreate them:

DROP POLICY IF EXISTS "Admins can view settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;

CREATE POLICY "Admins can view settings"
  ON public.admin_settings
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update settings"
  ON public.admin_settings
  FOR UPDATE
  USING (is_admin());

-- STEP 4: Test the is_admin() function
-- Run this while logged in as admin:
SELECT is_admin() as am_i_admin;
-- Should return: true

-- STEP 5: Check your admin user role
SELECT id, email, role 
FROM public.users 
WHERE email = 'admin@gmail.com';
-- Should show: role = 'admin'

-- If role is NOT 'admin', fix it:
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@gmail.com';

-- STEP 6: Verify you can read admin_settings
SELECT * FROM admin_settings;
-- Should return one row with settings

-- STEP 7: If admin_settings table is empty, insert default row
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
  notification_email
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
  'josh@mobileappcity.com'
) ON CONFLICT (id) DO NOTHING;

-- STEP 8: Final verification - Check everything
SELECT 
  'Admin function exists' as check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'is_admin'
  ) THEN '✅' ELSE '❌' END as status
UNION ALL
SELECT 
  'Admin settings table exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'admin_settings'
  ) THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
  'RLS policies exist',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_settings'
  ) THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
  'Admin user exists',
  CASE WHEN EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = 'admin@gmail.com' AND role = 'admin'
  ) THEN '✅' ELSE '❌' END;

-- All should show ✅
