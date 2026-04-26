ALTER TABLE public.billing_preferences
ADD COLUMN IF NOT EXISTS receipt_email TEXT;

ALTER TABLE public.billing_preferences
DROP CONSTRAINT IF EXISTS billing_preferences_receipt_email_check;

ALTER TABLE public.billing_preferences
ADD CONSTRAINT billing_preferences_receipt_email_check
CHECK (
  receipt_email IS NULL
  OR receipt_email = ''
  OR receipt_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
);