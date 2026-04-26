DROP POLICY IF EXISTS "Anyone can submit landing leads" ON public.landing_leads;

ALTER TABLE public.landing_leads
  ADD CONSTRAINT landing_leads_email_valid_check
  CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  ADD CONSTRAINT landing_leads_name_length_check
  CHECK (name IS NULL OR char_length(name) <= 120),
  ADD CONSTRAINT landing_leads_household_type_length_check
  CHECK (household_type IS NULL OR char_length(household_type) <= 80),
  ADD CONSTRAINT landing_leads_message_length_check
  CHECK (message IS NULL OR char_length(message) <= 1000);

CREATE POLICY "Visitors can submit valid landing leads"
ON public.landing_leads
FOR INSERT
WITH CHECK (
  email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND (name IS NULL OR char_length(name) <= 120)
  AND (household_type IS NULL OR char_length(household_type) <= 80)
  AND (message IS NULL OR char_length(message) <= 1000)
);