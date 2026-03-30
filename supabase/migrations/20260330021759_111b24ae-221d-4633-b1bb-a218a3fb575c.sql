-- Table to share individual items to additional houses
CREATE TABLE public.item_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, house_id)
);

ALTER TABLE public.item_shares ENABLE ROW LEVEL SECURITY;

-- Item owner can share their items
CREATE POLICY "Item owner can share" ON public.item_shares
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.inventory_items WHERE id = item_id AND user_id = auth.uid())
);

-- Members of the house can view shares for that house
CREATE POLICY "House members can view shares" ON public.item_shares
FOR SELECT TO authenticated
USING (
  is_house_member(auth.uid(), house_id)
  OR EXISTS (SELECT 1 FROM public.inventory_items WHERE id = item_id AND user_id = auth.uid())
);

-- Item owner can unshare
CREATE POLICY "Item owner can unshare" ON public.item_shares
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.inventory_items WHERE id = item_id AND user_id = auth.uid())
);