-- Enable Row Level Security on public.user_profiles (PostgREST-exposed tables must use RLS)
-- Table may use id (uuid = auth.users) or user_id as the ownership column.

DO $$
DECLARE
  owner_col text;
BEGIN
  IF to_regclass('public.user_profiles') IS NULL THEN
    RAISE NOTICE 'public.user_profiles does not exist; skipping RLS migration.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'id'
  ) THEN
    owner_col := 'id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'user_id'
  ) THEN
    owner_col := 'user_id';
  ELSE
    RAISE EXCEPTION 'public.user_profiles has neither id nor user_id column; add RLS policies manually.';
  END IF;

  EXECUTE 'ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY';

  EXECUTE format($p$
    DROP POLICY IF EXISTS "user_profiles_select_own_or_admin" ON public.user_profiles;
    DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
    DROP POLICY IF EXISTS "user_profiles_update_own_or_admin" ON public.user_profiles;
    DROP POLICY IF EXISTS "user_profiles_delete_own_or_admin" ON public.user_profiles;
  $p$);

  EXECUTE format($p$
    CREATE POLICY "user_profiles_select_own_or_admin"
      ON public.user_profiles FOR SELECT
      USING (auth.uid() = %I OR public.is_admin());
  $p$, owner_col);

  EXECUTE format($p$
    CREATE POLICY "user_profiles_insert_own"
      ON public.user_profiles FOR INSERT
      WITH CHECK (auth.uid() = %I);
  $p$, owner_col);

  EXECUTE format($p$
    CREATE POLICY "user_profiles_update_own_or_admin"
      ON public.user_profiles FOR UPDATE
      USING (auth.uid() = %I OR public.is_admin())
      WITH CHECK (auth.uid() = %I OR public.is_admin());
  $p$, owner_col, owner_col);

  EXECUTE format($p$
    CREATE POLICY "user_profiles_delete_own_or_admin"
      ON public.user_profiles FOR DELETE
      USING (auth.uid() = %I OR public.is_admin());
  $p$, owner_col);

  RAISE NOTICE 'RLS enabled on public.user_profiles using column %.', owner_col;
END $$;
