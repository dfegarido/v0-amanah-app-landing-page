-- ============================================
-- CLEANUP: Remove Orphaned Auth Users
-- Use this to clean up test accounts or failed registrations
-- ============================================

-- ⚠️ WARNING: This will DELETE auth users and their profiles
-- Only use for development/testing!

-- Step 1: Find orphaned auth users (those without profiles)
-- These are users that were created but the trigger failed
SELECT 
  au.id,
  au.email,
  au.created_at,
  'Orphaned - No profile in public.users' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Step 2: Create profiles for orphaned users (RECOMMENDED)
-- This fixes them instead of deleting
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

-- Step 3: If you want to DELETE orphaned auth users instead:
-- ⚠️ DANGER: This permanently deletes users!
-- Uncomment and run only if you're sure:

/*
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  -- Count orphaned users
  SELECT COUNT(*) INTO orphaned_count
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
  
  IF orphaned_count > 0 THEN
    -- Delete orphaned auth users
    DELETE FROM auth.users
    WHERE id IN (
      SELECT au.id
      FROM auth.users au
      LEFT JOIN public.users pu ON au.id = pu.id
      WHERE pu.id IS NULL
    );
    
    RAISE NOTICE 'Deleted % orphaned auth users', orphaned_count;
  ELSE
    RAISE NOTICE 'No orphaned users found';
  END IF;
END $$;
*/

-- Step 4: Find users that can be safely removed (no subscriptions, no data)
-- These are users with accounts but no activity
SELECT 
  u.id,
  u.email,
  u.created_at,
  (SELECT COUNT(*) FROM subscriptions WHERE user_id = u.id) as subscription_count,
  (SELECT COUNT(*) FROM mosques WHERE user_id = u.id) as mosque_count,
  (SELECT COUNT(*) FROM businesses WHERE user_id = u.id) as business_count
FROM public.users u
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN mosques m ON u.id = m.user_id
LEFT JOIN businesses b ON u.id = b.user_id
WHERE s.id IS NULL 
  AND m.id IS NULL 
  AND b.id IS NULL
  AND u.role = 'user'  -- Don't delete admins!
ORDER BY u.created_at DESC;

-- Step 5: Verify all users now have profiles
SELECT 
  'Verification' as check,
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_profiles,
  COUNT(*) - (SELECT COUNT(*) FROM public.users) as missing_profiles
FROM auth.users;

-- Should show: missing_profiles = 0

SELECT 
  '✅ CLEANUP COMPLETE!' as message,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM auth.users au
      LEFT JOIN public.users pu ON au.id = pu.id
      WHERE pu.id IS NULL
    ) THEN 'All users have profiles ✅'
    ELSE 'Some users still missing profiles ⚠️'
  END as status;
