-- RLS policies were present but enforcement was off. PostgREST still exposed the table
-- until RLS is enabled on the underlying relation.

DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NULL THEN
    RAISE NOTICE 'public.user_profiles does not exist; skipping.';
    RETURN;
  END IF;

  ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
END $$;
