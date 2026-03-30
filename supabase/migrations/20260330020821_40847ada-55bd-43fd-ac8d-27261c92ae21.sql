-- Fix: allow house owner to SELECT their own houses (not just members)
DROP POLICY IF EXISTS "Members can view houses" ON public.houses;
CREATE POLICY "Members or owner can view houses" ON public.houses
FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR is_house_member(auth.uid(), id));

-- Fix: house_members insert - allow self-insert
DROP POLICY IF EXISTS "House owner can add members" ON public.house_members;
CREATE POLICY "Owner or self can add members" ON public.house_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM houses WHERE houses.id = house_members.house_id AND houses.owner_id = auth.uid())
);