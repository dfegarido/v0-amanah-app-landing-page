-- Migration: Add donation fields to businesses table
-- Date: 2026-01-07
-- Description: Adds fields to store additional donation information for business subscriptions

-- Add donation fields
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS donate_to_same_organization BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS donation_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS donation_mosque_code INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN public.businesses.donate_to_same_organization IS 'Whether the business wants to donate to the same organization (affiliated mosque) or a different one';
COMMENT ON COLUMN public.businesses.donation_amount IS 'Amount the business wants to donate (in dollars)';
COMMENT ON COLUMN public.businesses.donation_mosque_code IS 'Mosque code for the donation recipient (if donating to same organization, uses affiliated mosque code)';

-- Add foreign key constraint if mosque code is provided
ALTER TABLE public.businesses
ADD CONSTRAINT fk_business_donation_mosque 
FOREIGN KEY (donation_mosque_code) 
REFERENCES public.mosques(mosque_code) 
ON DELETE SET NULL;

