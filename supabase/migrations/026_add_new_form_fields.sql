-- Migration: Add new form fields to mosques and nonprofits tables
-- Date: 2026-01-05
-- Description: Adds city, state, zip, country, individual social media fields, programs/services links, and committee members

-- Add new fields to mosques table
ALTER TABLE public.mosques
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS other_social TEXT,
ADD COLUMN IF NOT EXISTS sunday_school_link TEXT;

-- Add new fields to nonprofits table
ALTER TABLE public.nonprofits
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA',
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS other_social TEXT,
ADD COLUMN IF NOT EXISTS programs_link TEXT,
ADD COLUMN IF NOT EXISTS services TEXT,
ADD COLUMN IF NOT EXISTS committee_members TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.mosques.facebook IS 'Facebook page URL';
COMMENT ON COLUMN public.mosques.instagram IS 'Instagram profile URL';
COMMENT ON COLUMN public.mosques.twitter IS 'Twitter/X profile URL';
COMMENT ON COLUMN public.mosques.other_social IS 'Other social media URL';
COMMENT ON COLUMN public.mosques.sunday_school_link IS 'Sunday school information page URL';

COMMENT ON COLUMN public.nonprofits.city IS 'City location';
COMMENT ON COLUMN public.nonprofits.state IS 'State location';
COMMENT ON COLUMN public.nonprofits.zip IS 'ZIP/Postal code';
COMMENT ON COLUMN public.nonprofits.country IS 'Country location';
COMMENT ON COLUMN public.nonprofits.facebook IS 'Facebook page URL';
COMMENT ON COLUMN public.nonprofits.instagram IS 'Instagram profile URL';
COMMENT ON COLUMN public.nonprofits.twitter IS 'Twitter/X profile URL';
COMMENT ON COLUMN public.nonprofits.other_social IS 'Other social media URL';
COMMENT ON COLUMN public.nonprofits.programs_link IS 'Programs/Events page URL';
COMMENT ON COLUMN public.nonprofits.services IS 'JSON array of services/programs with names and links';
COMMENT ON COLUMN public.nonprofits.committee_members IS 'JSON array of board members with photos, names, and titles';
COMMENT ON COLUMN public.nonprofits.description IS 'Organization description';

