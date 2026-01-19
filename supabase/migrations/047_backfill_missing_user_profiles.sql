-- Backfill missing user profiles
-- This fixes users who exist in auth.users but not in public.users

-- First, ensure the trigger function exists and is correct
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert user profile, handle duplicates gracefully
  INSERT INTO public.users (id, email, name, phone, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    CASE 
      WHEN (NEW.raw_user_meta_data->>'role') IN ('user', 'business_owner', 'admin') THEN
        (NEW.raw_user_meta_data->>'role')::user_role
      ELSE
        'user'::user_role
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Now backfill any missing profiles
INSERT INTO public.users (id, email, name, phone, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', 'User'),
  au.raw_user_meta_data->>'phone',
  CASE 
    WHEN (au.raw_user_meta_data->>'role') IN ('user', 'business_owner', 'admin') THEN
      (au.raw_user_meta_data->>'role')::user_role
    ELSE
      'user'::user_role
  END,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
