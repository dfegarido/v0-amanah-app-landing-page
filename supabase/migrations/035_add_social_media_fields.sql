-- Migration: Add YouTube, Google, and TikTok social media fields
-- Date: 2026-01-07
-- Description: Adds YouTube, Google Business, and TikTok fields to mosques and nonprofits tables

-- Add new social media fields to mosques table
ALTER TABLE public.mosques
ADD COLUMN IF NOT EXISTS youtube TEXT,
ADD COLUMN IF NOT EXISTS google TEXT,
ADD COLUMN IF NOT EXISTS tiktok TEXT;

-- Add new social media fields to nonprofits table
ALTER TABLE public.nonprofits
ADD COLUMN IF NOT EXISTS youtube TEXT,
ADD COLUMN IF NOT EXISTS google TEXT,
ADD COLUMN IF NOT EXISTS tiktok TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.mosques.youtube IS 'YouTube channel URL';
COMMENT ON COLUMN public.mosques.google IS 'Google Business/Maps URL';
COMMENT ON COLUMN public.mosques.tiktok IS 'TikTok profile URL';

COMMENT ON COLUMN public.nonprofits.youtube IS 'YouTube channel URL';
COMMENT ON COLUMN public.nonprofits.google IS 'Google Business/Maps URL';
COMMENT ON COLUMN public.nonprofits.tiktok IS 'TikTok profile URL';

