
-- Add invite_token column to house_invites
ALTER TABLE public.house_invites 
ADD COLUMN invite_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Create unique index on invite_token
CREATE UNIQUE INDEX house_invites_token_idx ON public.house_invites(invite_token);

-- Allow anyone authenticated to read an invite by token (for accepting)
CREATE POLICY "Anyone can read invite by token"
ON public.house_invites
FOR SELECT
TO authenticated
USING (true);

-- Drop the old narrow select policy since the new one is broader
DROP POLICY IF EXISTS "Users can see their own invites" ON public.house_invites;

-- Function to accept an invite by token
CREATE OR REPLACE FUNCTION public.accept_invite_by_token(_token UUID, _user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT * INTO inv FROM public.house_invites WHERE invite_token = _token AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM public.house_members WHERE house_id = inv.house_id AND user_id = _user_id) THEN
    RETURN 'already_member';
  END IF;

  -- Add as member
  INSERT INTO public.house_members (house_id, user_id, role, relationship, share_mode)
  VALUES (inv.house_id, _user_id, inv.role::public.house_role, inv.relationship, inv.share_mode);

  -- Mark invite as accepted
  UPDATE public.house_invites SET status = 'accepted' WHERE id = inv.id;

  RETURN 'accepted';
END;
$$;
