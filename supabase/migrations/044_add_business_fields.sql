-- Add missing fields to businesses table for full form support

-- Internal contact information
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS contact_name TEXT;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Individual social media fields (in addition to the JSONB social_media field)
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS facebook TEXT;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS instagram TEXT;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS twitter TEXT;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS youtube TEXT;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS linkedin TEXT;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS tiktok TEXT;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS google TEXT;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS other_social TEXT;

-- Additional information
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_businesses_contact_email ON public.businesses(contact_email);
CREATE INDEX IF NOT EXISTS idx_businesses_contact_phone ON public.businesses(contact_phone);

