-- ================================================
-- Update user roles to only 'user' and 'admin'
-- Remove 'business_owner' role
-- ================================================

-- Step 1: Convert any business_owners to regular users
UPDATE public.users 
SET role = 'user' 
WHERE role = 'business_owner';

-- Step 2: Drop all RLS policies that reference the role column
DROP POLICY IF EXISTS "Business owners can insert own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Authorized users can create mosques" ON public.mosques;
DROP POLICY IF EXISTS "Admins can manage all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admins can manage all mosques" ON public.mosques;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;

-- Step 3: Change column type to TEXT temporarily
ALTER TABLE public.users 
ALTER COLUMN role TYPE TEXT;

-- Step 4: Drop and recreate the enum
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Step 5: Convert column back to enum type
ALTER TABLE public.users 
ALTER COLUMN role TYPE user_role USING role::user_role;

-- Step 6: Set default to 'user'
ALTER TABLE public.users 
ALTER COLUMN role SET DEFAULT 'user';

-- Step 7: Drop ALL remaining policies to ensure clean slate
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view active businesses" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can view own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can update own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Anyone can view active mosques" ON public.mosques;
DROP POLICY IF EXISTS "Mosque owners can view own mosques" ON public.mosques;
DROP POLICY IF EXISTS "Mosque owners can update own mosques" ON public.mosques;

-- Step 8: Recreate RLS policies with updated logic (only 'user' and 'admin')

-- Users table policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view all users"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Businesses table policies
CREATE POLICY "Anyone can view active businesses"
  ON public.businesses FOR SELECT
  USING (status = 'active');

CREATE POLICY "Business owners can view own businesses"
  ON public.businesses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business owners can update own businesses"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all businesses"
  ON public.businesses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Mosques table policies
CREATE POLICY "Anyone can view active mosques"
  ON public.mosques FOR SELECT
  USING (status = 'active');

CREATE POLICY "Mosque owners can view own mosques"
  ON public.mosques FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create mosques"
  ON public.mosques FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mosque owners can update own mosques"
  ON public.mosques FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all mosques"
  ON public.mosques FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Verify the change
SELECT 'Roles updated successfully! Only user and admin roles remain.' as message;
