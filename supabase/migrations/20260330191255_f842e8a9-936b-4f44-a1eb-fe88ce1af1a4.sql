
-- Drop the insecure open SELECT policy
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.house_invites;

-- Create a security definer function to look up invite by token
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token uuid)
RETURNS SETOF public.house_invites
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.house_invites
  WHERE invite_token = _token AND status = 'pending'
  LIMIT 1;
$$;

-- Create a scoped SELECT policy: only the invitee (by email) or the house owner can read
CREATE POLICY "Invitee or owner can read invite" ON public.house_invites
  FOR SELECT TO authenticated
  USING (
    email = (auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM houses h
      WHERE h.id = house_invites.house_id AND h.owner_id = auth.uid()
    )
  );
