-- Migration: Add title and fax fields to businesses table
-- Date: 2026-01-08
-- Description: Adds title (Business Name) and fax fields to businesses table

-- Add title field (Business Name)
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add fax field
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS fax TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.businesses.title IS 'Business name/title (displayed publicly)';
COMMENT ON COLUMN public.businesses.fax IS 'Business fax number';

