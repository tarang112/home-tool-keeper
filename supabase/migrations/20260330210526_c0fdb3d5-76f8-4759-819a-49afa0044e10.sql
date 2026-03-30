
-- Fix storage policies to enforce ownership via folder path = auth.uid()

-- DROP all broad storage policies
DROP POLICY IF EXISTS "Users can upload inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own inventory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Recreate with ownership checks
CREATE POLICY "Users can upload their own images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inventory-images' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can view their own images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'inventory-images' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can update their own images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'inventory-images' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'inventory-images' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- Also allow viewing house-scoped images (houses/ folder) for house members
CREATE POLICY "House members can view house images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'inventory-images'
    AND (storage.foldername(name))[1] = 'houses'
    AND public.is_house_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
  );

-- Fix is_item_shared_to_user to respect share_mode
CREATE OR REPLACE FUNCTION public.is_item_shared_to_user(_user_id uuid, _item_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.item_shares s
    JOIN public.house_members hm ON hm.house_id = s.house_id AND hm.user_id = _user_id AND hm.share_mode = 'full'
    WHERE s.item_id = _item_id
  )
$$;
