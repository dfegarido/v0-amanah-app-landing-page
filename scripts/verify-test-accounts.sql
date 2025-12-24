-- Verify test accounts exist and have profiles
-- Run this in Supabase SQL Editor

-- Check auth users
SELECT 
  '=== AUTH USERS ===' as section,
  '' as blank;

SELECT 
  email,
  created_at,
  email_confirmed_at IS NOT NULL as confirmed
FROM auth.users
WHERE email IN ('admin@test.com', 'user@test.com')
ORDER BY email;

-- Check profiles
SELECT 
  '=== PROFILES ===' as section,
  '' as blank;

SELECT 
  email,
  name,
  role,
  created_at
FROM public.users
WHERE email IN ('admin@test.com', 'user@test.com')
ORDER BY email;

-- Check for any missing profiles
SELECT 
  '=== MISSING PROFILES ===' as section,
  '' as blank;

SELECT 
  au.email,
  au.id as auth_id,
  CASE WHEN pu.id IS NULL THEN '❌ Missing Profile' ELSE '✅ Has Profile' END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email IN ('admin@test.com', 'user@test.com')
ORDER BY au.email;

-- If profiles are missing, create them
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', CASE WHEN au.email = 'admin@test.com' THEN 'Test Admin' ELSE 'Test User' END),
  CASE WHEN au.email = 'admin@test.com' THEN 'admin'::user_role ELSE 'user'::user_role END,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email IN ('admin@test.com', 'user@test.com')
  AND pu.id IS NULL
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Final verification
SELECT 
  '=== FINAL STATUS ===' as section,
  '' as blank;

SELECT 
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  pu.id IS NOT NULL as has_profile,
  pu.role as profile_role,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL AND pu.id IS NOT NULL 
    THEN '✅ Ready to Login'
    WHEN pu.id IS NULL 
    THEN '❌ Missing Profile'
    WHEN au.email_confirmed_at IS NULL 
    THEN '⚠️ Email Not Confirmed'
    ELSE '✅ OK'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email IN ('admin@test.com', 'user@test.com')
ORDER BY au.email;
