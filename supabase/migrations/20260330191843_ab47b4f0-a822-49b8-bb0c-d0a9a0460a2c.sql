
-- Drop the current INSERT policy
DROP POLICY IF EXISTS "Owner or invited user can add members" ON public.house_members;

-- Create a security definer function to get the invited role
CREATE OR REPLACE FUNCTION public.get_invite_role(_house_id uuid, _email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.house_invites
  WHERE house_id = _house_id
    AND email = lower(_email)
    AND status IN ('pending', 'accepted')
  LIMIT 1;
$$;

-- Tighter INSERT policy: enforces role matches invite
CREATE POLICY "Owner or invited user can add members" ON public.house_members
FOR INSERT TO authenticated
WITH CHECK (
  -- House owner can add anyone
  EXISTS (
    SELECT 1 FROM public.houses h
    WHERE h.id = house_members.house_id AND h.owner_id = auth.uid()
  )
  OR
  -- Invited user: must match their email, set own user_id, and use the role from the invite
  (
    user_id = auth.uid()
    AND role::text = public.get_invite_role(house_members.house_id, auth.jwt() ->> 'email')
  )
);
