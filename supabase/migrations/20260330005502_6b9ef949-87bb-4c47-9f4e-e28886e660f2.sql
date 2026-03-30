
-- Create houses table
CREATE TABLE public.houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

-- Create house_members table
CREATE TYPE public.house_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE public.house_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role house_role NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(house_id, user_id)
);

ALTER TABLE public.house_members ENABLE ROW LEVEL SECURITY;

-- Add house_id to inventory_items (nullable for backward compat)
ALTER TABLE public.inventory_items ADD COLUMN house_id uuid REFERENCES public.houses(id) ON DELETE SET NULL;

-- Helper: check if user is member of a house
CREATE OR REPLACE FUNCTION public.is_house_member(_user_id uuid, _house_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.house_members
    WHERE user_id = _user_id AND house_id = _house_id
  )
$$;

-- Houses RLS: members can see their houses
CREATE POLICY "Members can view houses"
  ON public.houses FOR SELECT
  TO authenticated
  USING (public.is_house_member(auth.uid(), id));

CREATE POLICY "Owner can update house"
  ON public.houses FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete house"
  ON public.houses FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create houses"
  ON public.houses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- House members RLS
CREATE POLICY "Members can view house members"
  ON public.house_members FOR SELECT
  TO authenticated
  USING (public.is_house_member(auth.uid(), house_id));

CREATE POLICY "House owner can add members"
  ON public.house_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.houses WHERE id = house_id AND owner_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "House owner can remove members"
  ON public.house_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.houses WHERE id = house_id AND owner_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Update inventory_items RLS to allow house members to access shared items
DROP POLICY IF EXISTS "Users can view their own items" ON public.inventory_items;
CREATE POLICY "Users can view own or shared items"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (house_id IS NOT NULL AND public.is_house_member(auth.uid(), house_id))
  );

DROP POLICY IF EXISTS "Users can update their own items" ON public.inventory_items;
CREATE POLICY "Users can update own or shared items"
  ON public.inventory_items FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (house_id IS NOT NULL AND public.is_house_member(auth.uid(), house_id))
  );

DROP POLICY IF EXISTS "Users can delete their own items" ON public.inventory_items;
CREATE POLICY "Users can delete own or shared items"
  ON public.inventory_items FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (house_id IS NOT NULL AND public.is_house_member(auth.uid(), house_id))
  );

-- Trigger for updated_at on houses
CREATE TRIGGER update_houses_updated_at
  BEFORE UPDATE ON public.houses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
