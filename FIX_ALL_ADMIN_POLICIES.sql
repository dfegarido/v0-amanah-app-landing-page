-- ============================================
-- COMPREHENSIVE FIX: All Admin RLS Policies
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- STEP 1: Verify/Create is_admin() function
-- This function is used by all admin policies to avoid recursion

DROP FUNCTION IF EXISTS public.is_admin();

CREATE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- STEP 2: Ensure your user is admin
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@gmail.com';

-- STEP 3: Fix RLS policies for USERS table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (is_admin());

-- STEP 4: Fix RLS policies for SUBSCRIPTIONS table
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (is_admin());

-- STEP 5: Fix RLS policies for MOSQUES table
DROP POLICY IF EXISTS "Anyone can view active mosques" ON public.mosques;
DROP POLICY IF EXISTS "Mosque owners can view own mosques" ON public.mosques;
DROP POLICY IF EXISTS "Admins can view all mosques" ON public.mosques;

CREATE POLICY "Anyone can view active mosques"
  ON public.mosques FOR SELECT
  USING (status = 'active');

CREATE POLICY "Mosque owners can view own mosques"
  ON public.mosques FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all mosques"
  ON public.mosques FOR SELECT
  USING (is_admin());

-- STEP 6: Fix RLS policies for BUSINESSES table
DROP POLICY IF EXISTS "Anyone can view active businesses" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can view own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admins can view all businesses" ON public.businesses;

CREATE POLICY "Anyone can view active businesses"
  ON public.businesses FOR SELECT
  USING (status = 'active');

CREATE POLICY "Business owners can view own businesses"
  ON public.businesses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all businesses"
  ON public.businesses FOR SELECT
  USING (is_admin());

-- STEP 7: Fix RLS policies for COUPONS table
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Users can view own coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can view all coupons" ON public.coupons;

CREATE POLICY "Anyone can view active coupons"
  ON public.coupons FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can view own coupons"
  ON public.coupons FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all coupons"
  ON public.coupons FOR SELECT
  USING (is_admin());

-- STEP 8: Fix RLS policies for NONPROFITS table
DROP POLICY IF EXISTS "Anyone can view active nonprofits" ON public.nonprofits;
DROP POLICY IF EXISTS "Users can view own nonprofits" ON public.nonprofits;
DROP POLICY IF EXISTS "Admins can view all nonprofits" ON public.nonprofits;

CREATE POLICY "Anyone can view active nonprofits"
  ON public.nonprofits FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can view own nonprofits"
  ON public.nonprofits FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all nonprofits"
  ON public.nonprofits FOR SELECT
  USING (is_admin());

-- STEP 9: Fix ADMIN_SETTINGS policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_settings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view settings" ON public.admin_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings';
    
    EXECUTE 'CREATE POLICY "Admins can view settings" ON public.admin_settings FOR SELECT USING (is_admin())';
    EXECUTE 'CREATE POLICY "Admins can update settings" ON public.admin_settings FOR UPDATE USING (is_admin())';
  END IF;
END $$;

-- STEP 10: Verification
SELECT '=== VERIFICATION ===' as section;

-- Check is_admin function
SELECT 
  'is_admin() function' as check,
  CASE WHEN is_admin() THEN '✅ Working' ELSE '❌ Returns false' END as status;

-- Check admin user
SELECT 
  'Admin user role' as check,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = 'admin@gmail.com' AND role = 'admin'
  ) THEN '✅ Correct' ELSE '❌ Not admin' END as status;

-- Check policies created
SELECT 
  'Admin policies count' as check,
  COUNT(*)::text || ' policies' as status
FROM pg_policies 
WHERE policyname ILIKE '%admin%';

-- List all admin policies
SELECT 
  '=== ADMIN POLICIES ===' as info,
  '' as blank;

SELECT 
  tablename as table_name,
  policyname as policy_name,
  cmd as operation
FROM pg_policies 
WHERE policyname ILIKE '%admin%'
ORDER BY tablename, policyname;

-- Final message
SELECT 
  '✅ ALL ADMIN POLICIES FIXED!' as message,
  'Logout, clear cache, and login again' as next_step;
