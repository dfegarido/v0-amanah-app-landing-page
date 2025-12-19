-- Create Admin Account for rorounifix@gmail.com
-- This script updates an existing user to admin role
-- 
-- First, the user must register through the app at:
-- http://localhost:3000/member/register
-- 
-- Email: rorounifix@gmail.com
-- Password: P@$$w0rd
--
-- Then run this script to upgrade to admin:

-- Update user role to admin
UPDATE public.users 
SET role = 'admin'
WHERE email = 'rorounifix@gmail.com';

-- Verify the update
SELECT id, email, name, role, created_at 
FROM public.users 
WHERE email = 'rorounifix@gmail.com';

