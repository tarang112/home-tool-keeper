-- Create a function to check if user has full access to a house (not selected-only)
CREATE OR REPLACE FUNCTION public.has_full_house_access(_user_id uuid, _house_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.house_members
    WHERE user_id = _user_id 
      AND house_id = _house_id
      AND share_mode = 'full'
  )
$$;

-- Update inventory_items SELECT policy to respect share_mode
DROP POLICY IF EXISTS "Users can view own or shared items" ON public.inventory_items;
CREATE POLICY "Users can view own or shared items" ON public.inventory_items
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (house_id IS NOT NULL AND has_full_house_access(auth.uid(), house_id))
  OR (id IN (SELECT item_id FROM public.item_shares WHERE is_house_member(auth.uid(), house_id)))
);

-- Update UPDATE policy similarly
DROP POLICY IF EXISTS "Users can update own or shared items" ON public.inventory_items;
CREATE POLICY "Users can update own or shared items" ON public.inventory_items
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR (house_id IS NOT NULL AND has_full_house_access(auth.uid(), house_id))
  OR (id IN (SELECT item_id FROM public.item_shares WHERE is_house_member(auth.uid(), house_id)))
);

-- Update DELETE policy similarly
DROP POLICY IF EXISTS "Users can delete own or shared items" ON public.inventory_items;
CREATE POLICY "Users can delete own or shared items" ON public.inventory_items
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR (house_id IS NOT NULL AND has_full_house_access(auth.uid(), house_id))
  OR (id IN (SELECT item_id FROM public.item_shares WHERE is_house_member(auth.uid(), house_id)))
);