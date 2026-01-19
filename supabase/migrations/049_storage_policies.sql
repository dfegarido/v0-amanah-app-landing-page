-- Storage policies for the 'uploads' bucket
-- These policies allow authenticated users to upload, read, update, and delete files

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;

-- Policy: Authenticated users can upload files to the uploads bucket
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Policy: Authenticated users can read files from the uploads bucket
CREATE POLICY "Authenticated users can read files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'uploads');

-- Policy: Authenticated users can update files in the uploads bucket
CREATE POLICY "Authenticated users can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');

-- Policy: Authenticated users can delete files from the uploads bucket
CREATE POLICY "Authenticated users can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');
