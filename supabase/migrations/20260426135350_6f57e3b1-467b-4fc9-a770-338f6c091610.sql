CREATE TABLE IF NOT EXISTS public.billing_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'starter',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  location_count INTEGER NOT NULL DEFAULT 1,
  unit_amount_cents INTEGER NOT NULL DEFAULT 0,
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'selected',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT billing_preferences_plan_check CHECK (plan IN ('starter', 'household', 'business')),
  CONSTRAINT billing_preferences_billing_cycle_check CHECK (billing_cycle IN ('monthly', 'yearly')),
  CONSTRAINT billing_preferences_location_count_check CHECK (location_count >= 1 AND location_count <= 999),
  CONSTRAINT billing_preferences_amounts_check CHECK (unit_amount_cents >= 0 AND total_amount_cents >= 0),
  CONSTRAINT billing_preferences_status_check CHECK (status IN ('selected', 'checkout_started', 'active', 'cancelled'))
);

ALTER TABLE public.billing_preferences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_billing_preferences_user_id ON public.billing_preferences (user_id);
CREATE INDEX IF NOT EXISTS idx_billing_preferences_status ON public.billing_preferences (status);

CREATE OR REPLACE FUNCTION public.update_billing_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_billing_preferences_updated_at ON public.billing_preferences;
CREATE TRIGGER update_billing_preferences_updated_at
BEFORE UPDATE ON public.billing_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_billing_preferences_updated_at();

DROP POLICY IF EXISTS "Users can view their own billing preference" ON public.billing_preferences;
DROP POLICY IF EXISTS "Users can create their own billing preference" ON public.billing_preferences;
DROP POLICY IF EXISTS "Users can update their own billing preference" ON public.billing_preferences;
DROP POLICY IF EXISTS "Admins can view billing preferences" ON public.billing_preferences;

CREATE POLICY "Users can view their own billing preference"
ON public.billing_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own billing preference"
ON public.billing_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing preference"
ON public.billing_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view billing preferences"
ON public.billing_preferences
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
