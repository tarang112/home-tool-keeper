
-- Drop the current overly permissive INSERT policy
DROP POLICY IF EXISTS "Owner or self can add members" ON public.house_members;

-- Create a tighter INSERT policy: user can only add themselves if they are the house owner OR have a pending/accepted invite
CREATE POLICY "Owner or invited user can add members" ON public.house_members
FOR INSERT TO authenticated
WITH CHECK (
  -- House owner can add anyone
  EXISTS (
    SELECT 1 FROM public.houses h
    WHERE h.id = house_members.house_id AND h.owner_id = auth.uid()
  )
  OR
  -- User can add themselves only if they have a valid invite
  (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.house_invites i
      WHERE i.house_id = house_members.house_id
        AND i.email = (auth.jwt() ->> 'email')
        AND i.status IN ('pending', 'accepted')
    )
  )
);
