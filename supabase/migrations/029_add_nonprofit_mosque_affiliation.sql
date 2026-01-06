-- Add affiliated_mosque_code column to nonprofits table for mosque affiliation kickback
ALTER TABLE public.nonprofits
ADD COLUMN IF NOT EXISTS affiliated_mosque_code INTEGER,
ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- Add foreign key reference to mosques table
ALTER TABLE public.nonprofits
ADD CONSTRAINT nonprofits_affiliated_mosque_fkey 
FOREIGN KEY (affiliated_mosque_code) 
REFERENCES public.mosques(mosque_code) 
ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.nonprofits.affiliated_mosque_code IS 'Mosque code for 10% kickback affiliation';
COMMENT ON COLUMN public.nonprofits.contact_name IS 'Primary contact person name';

