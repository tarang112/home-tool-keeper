
-- Fix profiles policies: change from public to authenticated
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Fix inventory_items INSERT policy: change from public to authenticated
DROP POLICY IF EXISTS "Users can create their own items" ON public.inventory_items;
CREATE POLICY "Users can create their own items" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix storage.objects policies: change from public to authenticated
DROP POLICY IF EXISTS "Users can upload inventory images" ON storage.objects;
CREATE POLICY "Users can upload inventory images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'inventory-images' AND (storage.foldername(name))[1] != '');

DROP POLICY IF EXISTS "Users can view inventory images" ON storage.objects;
CREATE POLICY "Users can view inventory images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'inventory-images');

DROP POLICY IF EXISTS "Users can update own inventory images" ON storage.objects;
CREATE POLICY "Users can update own inventory images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'inventory-images');

DROP POLICY IF EXISTS "Users can delete own inventory images" ON storage.objects;
CREATE POLICY "Users can delete own inventory images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'inventory-images');
