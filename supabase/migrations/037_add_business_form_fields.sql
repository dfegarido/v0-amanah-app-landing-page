-- Migration: Add new business form fields
-- Date: 2026-01-07
-- Description: Adds contact fields, social media fields (YouTube, LinkedIn, TikTok, Google), and comments field to businesses table

-- Add contact fields (for internal use only)
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add social media fields
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS youtube TEXT,
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS tiktok TEXT,
ADD COLUMN IF NOT EXISTS google TEXT;

-- Add comments field
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.businesses.contact_name IS 'Contact person name (for internal use only, not displayed publicly)';
COMMENT ON COLUMN public.businesses.contact_phone IS 'Contact person phone number (for internal use only, not displayed publicly)';
COMMENT ON COLUMN public.businesses.contact_email IS 'Contact person email (for internal use only, not displayed publicly)';
COMMENT ON COLUMN public.businesses.youtube IS 'YouTube channel URL';
COMMENT ON COLUMN public.businesses.linkedin IS 'LinkedIn profile URL';
COMMENT ON COLUMN public.businesses.tiktok IS 'TikTok profile URL';
COMMENT ON COLUMN public.businesses.google IS 'Google Business/Maps URL';
COMMENT ON COLUMN public.businesses.comments IS 'Comments or questions from the business owner';

