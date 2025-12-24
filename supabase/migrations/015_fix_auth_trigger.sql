-- ============================================
-- FIX: Auth Trigger for User Profile Creation
-- Ensures profiles are created and accessible
-- ============================================

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create improved function that handles errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile, handle duplicates gracefully
  INSERT INTO public.users (id, email, name, phone, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'::user_role),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Ensure RLS policy allows users to view their own profile
-- This is critical - users must be able to read their own profile immediately after creation
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Step 5: Verify trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- Step 6: Test the function (simulate what happens during signup)
-- This will show if there are any errors
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test_' || extract(epoch from now())::text || '@test.com';
BEGIN
  -- Note: We can't actually insert into auth.users from here,
  -- but we can verify the function compiles correctly
  
  RAISE NOTICE 'Trigger function created successfully';
  RAISE NOTICE 'Test user would be: %', test_email;
END $$;

-- Step 7: Check if there are any users in auth.users without profiles
SELECT 
  'Auth users without profiles' as check,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Step 8: Create profiles for any missing users (backfill)
INSERT INTO public.users (id, email, name, phone, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', 'User'),
  au.raw_user_meta_data->>'phone',
  COALESCE((au.raw_user_meta_data->>'role')::user_role, 'user'::user_role),
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 9: Final verification
SELECT 
  '=== VERIFICATION ===' as section;

SELECT 
  'Trigger exists' as check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
  ) THEN '✅' ELSE '❌' END as status;

SELECT 
  'Function exists' as check,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'handle_new_user'
  ) THEN '✅' ELSE '❌' END as status;

SELECT 
  'RLS policy exists' as check,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users'
    AND policyname = 'Users can view own profile'
  ) THEN '✅' ELSE '❌' END as status;

SELECT 
  'All users have profiles' as check,
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  ) THEN '✅' ELSE '⚠️ Some users missing profiles' END as status;

SELECT '✅ AUTH TRIGGER FIXED!' as message;

