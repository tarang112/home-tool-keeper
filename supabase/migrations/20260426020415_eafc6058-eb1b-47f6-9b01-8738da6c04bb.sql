-- Replace broad owner invite access with action-specific policies
DROP POLICY IF EXISTS "House owners can manage invites" ON public.house_invites;
DROP POLICY IF EXISTS "Invitee or owner can read invite" ON public.house_invites;

CREATE POLICY "House owners can create invites"
ON public.house_invites
FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id = house_invites.house_id
      AND h.owner_id = auth.uid()
  )
);

CREATE POLICY "House owners can update invites"
ON public.house_invites
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id = house_invites.house_id
      AND h.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id = house_invites.house_id
      AND h.owner_id = auth.uid()
  )
);

CREATE POLICY "House owners can delete invites"
ON public.house_invites
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id = house_invites.house_id
      AND h.owner_id = auth.uid()
  )
);

CREATE POLICY "Invitee can read own invite"
ON public.house_invites
FOR SELECT
TO authenticated
USING (public.is_invite_for_user(email, auth.uid()));

CREATE OR REPLACE FUNCTION public.create_house_invite_link(
  _house_id uuid,
  _role text DEFAULT 'editor',
  _relationship text DEFAULT 'Household',
  _share_mode text DEFAULT 'full'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id = _house_id
      AND h.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized invite creation';
  END IF;

  IF _role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid invite role';
  END IF;

  IF _share_mode NOT IN ('full', 'selected') THEN
    RAISE EXCEPTION 'Invalid share mode';
  END IF;

  INSERT INTO public.house_invites (house_id, email, role, relationship, share_mode, invited_by)
  VALUES (
    _house_id,
    'link-invite-' || extract(epoch from clock_timestamp())::bigint || '-' || encode(gen_random_bytes(4), 'hex') || '@invite.local',
    _role,
    COALESCE(NULLIF(trim(_relationship), ''), 'Household'),
    _share_mode,
    auth.uid()
  )
  RETURNING invite_token INTO new_token;

  RETURN new_token;
END;
$$;