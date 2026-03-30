-- Fix infinite recursion: create security definer functions to break the cycle

-- Function to check if user owns an item (avoids querying inventory_items in item_shares policy)
CREATE OR REPLACE FUNCTION public.is_item_owner(_user_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE id = _item_id AND user_id = _user_id
  )
$$;

-- Function to check if user has a shared item (avoids querying item_shares in inventory_items policy)
CREATE OR REPLACE FUNCTION public.is_item_shared_to_user(_user_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.item_shares s
    JOIN public.house_members hm ON hm.house_id = s.house_id AND hm.user_id = _user_id
    WHERE s.item_id = _item_id
  )
$$;

-- Fix inventory_items policies
DROP POLICY IF EXISTS "Users can view own or shared items" ON public.inventory_items;
CREATE POLICY "Users can view own or shared items" ON public.inventory_items
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (house_id IS NOT NULL AND has_full_house_access(auth.uid(), house_id))
  OR is_item_shared_to_user(auth.uid(), id)
);

DROP POLICY IF EXISTS "Users can update own or shared items" ON public.inventory_items;
CREATE POLICY "Users can update own or shared items" ON public.inventory_items
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR (house_id IS NOT NULL AND has_full_house_access(auth.uid(), house_id))
  OR is_item_shared_to_user(auth.uid(), id)
);

DROP POLICY IF EXISTS "Users can delete own or shared items" ON public.inventory_items;
CREATE POLICY "Users can delete own or shared items" ON public.inventory_items
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR (house_id IS NOT NULL AND has_full_house_access(auth.uid(), house_id))
  OR is_item_shared_to_user(auth.uid(), id)
);

-- Fix item_shares policies to use security definer function
DROP POLICY IF EXISTS "Item owner can share" ON public.item_shares;
CREATE POLICY "Item owner can share" ON public.item_shares
FOR INSERT TO authenticated
WITH CHECK (is_item_owner(auth.uid(), item_id));

DROP POLICY IF EXISTS "House members can view shares" ON public.item_shares;
CREATE POLICY "House members can view shares" ON public.item_shares
FOR SELECT TO authenticated
USING (
  is_house_member(auth.uid(), house_id)
  OR is_item_owner(auth.uid(), item_id)
);

DROP POLICY IF EXISTS "Item owner can unshare" ON public.item_shares;
CREATE POLICY "Item owner can unshare" ON public.item_shares
FOR DELETE TO authenticated
USING (is_item_owner(auth.uid(), item_id));