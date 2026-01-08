-- Add manual_donations field to mosques table
-- This allows admin to track donations made outside the platform (cash, checks, etc.)

ALTER TABLE public.mosques
ADD COLUMN IF NOT EXISTS manual_donations DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN public.mosques.manual_donations IS 'Manual donations tracked by admin (for donations made outside the platform)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mosques_manual_donations ON public.mosques(manual_donations) WHERE manual_donations > 0;

