ALTER TABLE public.billing_preferences
ADD COLUMN IF NOT EXISTS order_confirmation_email TEXT;

ALTER TABLE public.billing_preferences
DROP CONSTRAINT IF EXISTS billing_preferences_order_confirmation_email_check;

ALTER TABLE public.billing_preferences
ADD CONSTRAINT billing_preferences_order_confirmation_email_check
CHECK (
  order_confirmation_email IS NULL
  OR order_confirmation_email = ''
  OR order_confirmation_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
);