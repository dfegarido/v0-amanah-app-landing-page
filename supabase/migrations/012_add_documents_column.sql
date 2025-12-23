-- Add documents column to mosques and businesses tables

-- Add documents column to mosques
ALTER TABLE public.mosques
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Add documents column to businesses
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN public.mosques.documents IS 'Array of document objects: [{name: string, url: string, uploadedAt: string, type: string, size: number}]';
COMMENT ON COLUMN public.businesses.documents IS 'Array of document objects: [{name: string, url: string, uploadedAt: string, type: string, size: number}]';
