-- Remove public cross-member profile surface and replace it with restricted RPC helpers
DROP VIEW IF EXISTS public.member_profiles;

-- Ensure house membership cannot be duplicated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'house_members_house_id_user_id_key'
      AND conrelid = 'public.house_members'::regclass
  ) THEN
    ALTER TABLE public.house_members
      ADD CONSTRAINT house_members_house_id_user_id_key UNIQUE (house_id, user_id);
  END IF;
END $$;

-- Email addresses should not live in the public profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- New users only need a display profile row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$function$;

-- Normalize link-invite detection in one place
CREATE OR REPLACE FUNCTION public.is_link_invite_email(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT lower(COALESCE(_email, '')) LIKE 'link-invite-%@invite.local';
$function$;

-- Only house owners may add members directly; invite acceptance must go through secured RPCs
DROP POLICY IF EXISTS "Owner or invited user can add members" ON public.house_members;
CREATE POLICY "House owner can add members"
ON public.house_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id = house_members.house_id
      AND h.owner_id = auth.uid()
  )
);

-- Keep invite role lookups case-insensitive and pending-only
CREATE OR REPLACE FUNCTION public.get_invite_role(_house_id uuid, _email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.house_invites
  WHERE house_id = _house_id
    AND lower(email) = lower(trim(COALESCE(_email, '')))
    AND status = 'pending'
  LIMIT 1;
$function$;

-- Restricted member profile lookup for house members/owners only
CREATE OR REPLACE FUNCTION public.get_house_member_profiles(_house_id uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.display_name, p.avatar_url
  FROM public.house_members hm
  JOIN public.profiles p ON p.user_id = hm.user_id
  WHERE hm.house_id = _house_id
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.houses h
        WHERE h.id = _house_id
          AND h.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.house_members access_hm
        WHERE access_hm.house_id = _house_id
          AND access_hm.user_id = auth.uid()
      )
    );
$function$;

-- House owners can resolve an invitee by email without exposing emails client-side
CREATE OR REPLACE FUNCTION public.find_house_invitable_user(_house_id uuid, _email text)
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.id AS user_id, COALESCE(p.display_name, 'Member') AS display_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.houses h
      WHERE h.id = _house_id
        AND h.owner_id = auth.uid()
    )
    AND lower(trim(COALESCE(u.email, ''))) = lower(trim(COALESCE(_email, '')))
  LIMIT 1;
$function$;

-- Enforce that pending invite acceptance can only be performed by the authenticated invitee
CREATE OR REPLACE FUNCTION public.accept_pending_invites(_user_id uuid, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  normalized_email text := lower(trim(COALESCE(_email, '')));
  caller_email text := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  caller_id uuid := auth.uid();
  inv RECORD;
BEGIN
  IF caller_id IS NULL OR caller_id <> _user_id OR caller_email = '' OR caller_email <> normalized_email THEN
    RAISE EXCEPTION 'Unauthorized invite acceptance';
  END IF;

  FOR inv IN
    SELECT *
    FROM public.house_invites
    WHERE lower(email) = normalized_email
      AND status = 'pending'
  LOOP
    INSERT INTO public.house_members (house_id, user_id, role, relationship, share_mode)
    VALUES (inv.house_id, caller_id, inv.role::public.house_role, inv.relationship, inv.share_mode)
    ON CONFLICT (house_id, user_id) DO NOTHING;

    UPDATE public.house_invites
    SET status = 'accepted'
    WHERE id = inv.id;
  END LOOP;
END;
$function$;

-- Invite previews and acceptance must match the authenticated user unless the invite is a generated share link
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token uuid)
RETURNS SETOF public.house_invites
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT hi.*
  FROM public.house_invites hi
  WHERE hi.invite_token = _token
    AND hi.status = 'pending'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_link_invite_email(hi.email)
      OR lower(trim(hi.email)) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
      OR EXISTS (
        SELECT 1
        FROM public.houses h
        WHERE h.id = hi.house_id
          AND h.owner_id = auth.uid()
      )
    )
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.accept_invite_by_token(_token uuid, _user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv RECORD;
  caller_id uuid := auth.uid();
  caller_email text := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
BEGIN
  IF caller_id IS NULL OR caller_id <> _user_id THEN
    RAISE EXCEPTION 'Unauthorized invite acceptance';
  END IF;

  SELECT *
  INTO inv
  FROM public.house_invites
  WHERE invite_token = _token
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF NOT public.is_link_invite_email(inv.email)
     AND caller_email <> lower(trim(inv.email)) THEN
    RETURN 'not_found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.house_members
    WHERE house_id = inv.house_id
      AND user_id = caller_id
  ) THEN
    RETURN 'already_member';
  END IF;

  INSERT INTO public.house_members (house_id, user_id, role, relationship, share_mode)
  VALUES (inv.house_id, caller_id, inv.role::public.house_role, inv.relationship, inv.share_mode)
  ON CONFLICT (house_id, user_id) DO NOTHING;

  UPDATE public.house_invites
  SET status = 'accepted'
  WHERE id = inv.id;

  RETURN 'accepted';
END;
$function$;

-- Keep direct invite reads case-insensitive for owners/invitees
DROP POLICY IF EXISTS "Invitee or owner can read invite" ON public.house_invites;
CREATE POLICY "Invitee or owner can read invite"
ON public.house_invites
FOR SELECT
TO authenticated
USING (
  lower(email) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
  OR EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id = house_invites.house_id
      AND h.owner_id = auth.uid()
  )
);