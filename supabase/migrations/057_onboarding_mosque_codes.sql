-- Ordered mosque_code list for mobile app "favorite / onboarding" picker.
-- Empty array = show all live mosques (sorted by mosque_code). Non-empty = those codes first (live only), then remaining live mosques.

ALTER TABLE public.admin_settings
ADD COLUMN IF NOT EXISTS onboarding_mosque_codes JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.admin_settings.onboarding_mosque_codes IS
  'JSON array of integer mosque_code values for mobile onboarding order; [] uses all approved mosques only.';
