DROP POLICY IF EXISTS "House owners can manage house images" ON storage.objects;

CREATE POLICY "House owners can manage house images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'inventory-images'
  AND (storage.foldername(storage.objects.name))[1] = 'houses'
  AND EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id::text = (storage.foldername(storage.objects.name))[2]
      AND h.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'inventory-images'
  AND (storage.foldername(storage.objects.name))[1] = 'houses'
  AND EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id::text = (storage.foldername(storage.objects.name))[2]
      AND h.owner_id = auth.uid()
  )
);