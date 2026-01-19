-- Fix infinite recursion in users table RLS policy
-- The problem: Admin policy queries users table, which triggers the same policy again

-- Drop the problematic admin policies
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;

-- Create a helper function that bypasses RLS to check admin role
-- This function uses SECURITY DEFINER to bypass RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Now create the admin policy using the function
-- The function bypasses RLS, so no recursion
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    auth.uid() = id  -- Users can always see their own profile
    OR public.is_admin()  -- Admins can see all profiles (function bypasses RLS)
  );

-- Update other admin policies to use the function instead of direct queries
-- This prevents potential recursion issues and improves performance
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all mosques" ON public.mosques;
CREATE POLICY "Admins can view all mosques"
  ON public.mosques
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all businesses" ON public.businesses;
CREATE POLICY "Admins can view all businesses"
  ON public.businesses
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all coupons" ON public.coupons;
CREATE POLICY "Admins can view all coupons"
  ON public.coupons
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all nonprofits" ON public.nonprofits;
CREATE POLICY "Admins can view all nonprofits"
  ON public.nonprofits
  FOR SELECT
  USING (public.is_admin());

-- Add comment explaining the function
COMMENT ON FUNCTION public.is_admin() IS 'Checks if current user is admin. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion in policies.';
