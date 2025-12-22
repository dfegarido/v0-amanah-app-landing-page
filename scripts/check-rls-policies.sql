-- Run this in Supabase SQL Editor to check RLS policies

-- Check if RLS is enabled on tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'subscriptions', 'mosques', 'businesses', 'coupons', 'nonprofits')
ORDER BY tablename;

-- List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'subscriptions', 'mosques', 'businesses', 'coupons', 'nonprofits')
ORDER BY tablename, policyname;

-- Check specifically for admin policies
SELECT 
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname ILIKE '%admin%'
ORDER BY tablename, policyname;

-- Check current user's role (if logged in)
SELECT 
  id,
  email,
  role
FROM public.users
WHERE id = auth.uid();

