-- Migration: Add emergency contact fields to mosques table
-- Date: 2026-01-07
-- Description: Adds emergency contact name and phone number fields to mosques table

-- Add emergency contact fields to mosques table
ALTER TABLE public.mosques
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.mosques.emergency_contact_name IS 'Emergency contact person name (Point of Contact)';
COMMENT ON COLUMN public.mosques.emergency_contact_phone IS 'Emergency contact phone number';

