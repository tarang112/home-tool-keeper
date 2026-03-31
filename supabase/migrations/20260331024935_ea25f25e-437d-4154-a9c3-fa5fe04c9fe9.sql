
-- Allow authenticated users to upload to inventory-images bucket
CREATE POLICY "authenticated_upload_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inventory-images');

-- Allow authenticated users to read their uploaded images
CREATE POLICY "authenticated_read_images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'inventory-images');

-- Allow authenticated users to update their images
CREATE POLICY "authenticated_update_images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'inventory-images');

-- Allow authenticated users to delete their images
CREATE POLICY "authenticated_delete_images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'inventory-images');
