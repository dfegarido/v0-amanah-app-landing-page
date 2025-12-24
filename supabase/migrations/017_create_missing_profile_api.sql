-- ============================================
-- API Function: Create Profile for Current User
-- This can be called as a fallback if trigger fails
-- ============================================

-- Function to create profile for the currently authenticated user
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS JSONB AS $$
DECLARE
  auth_user_id UUID;
  auth_user_email TEXT;
  auth_user_metadata JSONB;
  new_profile RECORD;
BEGIN
  -- Get current auth user
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = auth_user_id) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Profile already exists',
      'user_id', auth_user_id
    );
  END IF;
  
  -- Get user data from auth.users (requires service role or function)
  -- Since we can't access auth.users directly, use metadata
  SELECT email, raw_user_meta_data INTO auth_user_email, auth_user_metadata
  FROM auth.users
  WHERE id = auth_user_id;
  
  -- Create profile
  INSERT INTO public.users (
    id,
    email,
    name,
    phone,
    role,
    created_at,
    updated_at
  ) VALUES (
    auth_user_id,
    COALESCE(auth_user_email, 'user@example.com'),
    COALESCE(auth_user_metadata->>'name', 'User'),
    auth_user_metadata->>'phone',
    COALESCE((auth_user_metadata->>'role')::user_role, 'user'::user_role),
    NOW(),
    NOW()
  )
  RETURNING * INTO new_profile;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile created successfully',
    'user_id', new_profile.id,
    'email', new_profile.email
  );
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile already exists'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_user_profile() IS 'Creates a profile in public.users for the currently authenticated user. Can be used as fallback if auth trigger fails.';
