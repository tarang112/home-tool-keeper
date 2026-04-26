-- Tighten inventory image bucket permissions
UPDATE storage.buckets
SET public = false
WHERE id = 'inventory-images';

DROP POLICY IF EXISTS "authenticated_read_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload_images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own inventory images" ON storage.objects;

CREATE POLICY "Users can view own inventory images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'inventory-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own inventory images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inventory-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own inventory images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inventory-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'inventory-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own inventory images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inventory-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "House owners can manage house images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'inventory-images'
  AND (storage.foldername(name))[1] = 'houses'
  AND EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id::text = (storage.foldername(name))[2]
      AND h.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'inventory-images'
  AND (storage.foldername(name))[1] = 'houses'
  AND EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id::text = (storage.foldername(name))[2]
      AND h.owner_id = auth.uid()
  )
);

-- Keep invite acceptance secure and restrict ordinary invite list reads to non-token fields
CREATE OR REPLACE FUNCTION public.get_pending_house_invites(_house_id uuid)
RETURNS TABLE(
  id uuid,
  house_id uuid,
  email text,
  role text,
  relationship text,
  share_mode text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hi.id, hi.house_id, hi.email, hi.role, hi.relationship, hi.share_mode, hi.status, hi.created_at
  FROM public.house_invites hi
  JOIN public.houses h ON h.id = hi.house_id
  WHERE hi.house_id = _house_id
    AND hi.status = 'pending'
    AND h.owner_id = auth.uid();
$$;

-- Make the role-update rule explicit and owner-only
DROP POLICY IF EXISTS "House owner can update members" ON public.house_members;
CREATE POLICY "House owner can update members"
ON public.house_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.houses
    WHERE houses.id = house_members.house_id
      AND houses.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.houses
    WHERE houses.id = house_members.house_id
      AND houses.owner_id = auth.uid()
  )
);