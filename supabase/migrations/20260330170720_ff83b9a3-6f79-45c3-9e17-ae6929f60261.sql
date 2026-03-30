
-- Create house_invites table for pending invitations
CREATE TABLE public.house_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  relationship TEXT,
  share_mode TEXT DEFAULT 'full',
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(house_id, email)
);

ALTER TABLE public.house_invites ENABLE ROW LEVEL SECURITY;

-- Owner can manage invites for their houses
CREATE POLICY "House owners can manage invites"
ON public.house_invites
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.houses h
    WHERE h.id = house_invites.house_id AND h.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.houses h
    WHERE h.id = house_invites.house_id AND h.owner_id = auth.uid()
  )
);

-- Users can read invites addressed to their email
CREATE POLICY "Users can see their own invites"
ON public.house_invites
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Function to accept pending invites for a user
CREATE OR REPLACE FUNCTION public.accept_pending_invites(_user_id UUID, _email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  FOR inv IN
    SELECT * FROM public.house_invites
    WHERE email = lower(_email) AND status = 'pending'
  LOOP
    -- Add as member if not already
    INSERT INTO public.house_members (house_id, user_id, role, relationship, share_mode)
    VALUES (inv.house_id, _user_id, inv.role::public.house_role, inv.relationship, inv.share_mode)
    ON CONFLICT DO NOTHING;

    -- Mark invite as accepted
    UPDATE public.house_invites SET status = 'accepted' WHERE id = inv.id;
  END LOOP;
END;
$$;
