-- Direct Admin Account Creation
-- This creates an admin user directly in Supabase
-- Email: rorounifix@gmail.com
-- Password: P@$$w0rd
--
-- IMPORTANT: Run this in Supabase SQL Editor

-- Step 1: Check if user already exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'rorounifix@gmail.com';

-- If user doesn't exist, you need to register first through the app
-- Then run this to make them admin:

-- Step 2: Update to admin role
UPDATE public.users 
SET role = 'admin'
WHERE email = 'rorounifix@gmail.com';

-- Step 3: Verify admin status
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.created_at,
  CASE 
    WHEN u.role = 'admin' THEN '✓ Admin access granted'
    ELSE '✗ Not admin'
  END as status
FROM public.users u
WHERE u.email = 'rorounifix@gmail.com';

