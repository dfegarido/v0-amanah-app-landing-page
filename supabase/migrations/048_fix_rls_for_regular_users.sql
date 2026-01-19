-- Fix RLS policies to allow regular users to create businesses and mosques
-- Regular users (role='user') should be able to create subscriptions

-- Drop ALL existing INSERT policies for businesses and mosques
DROP POLICY IF EXISTS "Business owners can insert own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can insert own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Authorized users can create mosques" ON public.mosques;
DROP POLICY IF EXISTS "Users can insert own mosques" ON public.mosques;

-- Allow any authenticated user to insert their own businesses
CREATE POLICY "Users can insert own businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow any authenticated user to insert their own mosques
CREATE POLICY "Users can insert own mosques"
  ON public.mosques FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Also ensure users can insert coupons and nonprofits (they should already have this, but let's verify)
-- These policies already exist in 009_subscriptions_rls.sql, so we don't need to recreate them
