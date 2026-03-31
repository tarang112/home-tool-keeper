
-- Fix 1: Replace direct email comparison in house_invites SELECT policy
-- with a secure function that validates against auth.users

CREATE OR REPLACE FUNCTION public.is_invite_for_user(_invite_email text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(trim(COALESCE(email, ''))) = lower(trim(COALESCE(_invite_email, '')))
  )
$$;

-- Drop the old invitee SELECT policy and recreate with secure function
DROP POLICY IF EXISTS "Invitee or owner can read invite" ON public.house_invites;

CREATE POLICY "Invitee or owner can read invite"
  ON public.house_invites
  FOR SELECT
  TO authenticated
  USING (
    is_invite_for_user(email, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.houses h
      WHERE h.id = house_invites.house_id AND h.owner_id = auth.uid()
    )
  );

-- Fix 2: Add UPDATE policy for house_members restricted to house owner
CREATE POLICY "House owner can update members"
  ON public.house_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.houses
      WHERE houses.id = house_members.house_id AND houses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.houses
      WHERE houses.id = house_members.house_id AND houses.owner_id = auth.uid()
    )
  );
