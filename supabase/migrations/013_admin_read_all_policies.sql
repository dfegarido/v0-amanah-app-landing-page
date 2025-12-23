-- Add policies to allow admins to read all data
-- These policies work ALONGSIDE user policies (OR logic)
-- Users can still read their own data, admins can read ALL data

-- Drop any conflicting policies first (if they exist)
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all mosques" ON public.mosques;
DROP POLICY IF EXISTS "Admins can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admins can view all coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can view all nonprofits" ON public.nonprofits;

-- Create admin read policies for users table
-- NOTE: This works WITH the existing "Users can view own profile" policy
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Create admin read policies for subscriptions table
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Create admin read policies for mosques table
CREATE POLICY "Admins can view all mosques"
  ON public.mosques
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Create admin read policies for businesses table
CREATE POLICY "Admins can view all businesses"
  ON public.businesses
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Create admin read policies for coupons table
CREATE POLICY "Admins can view all coupons"
  ON public.coupons
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Create admin read policies for nonprofits table
CREATE POLICY "Admins can view all nonprofits"
  ON public.nonprofits
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Verify policies are created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('users', 'subscriptions', 'mosques', 'businesses', 'coupons', 'nonprofits')
AND policyname LIKE '%Admin%'
ORDER BY tablename, policyname;
