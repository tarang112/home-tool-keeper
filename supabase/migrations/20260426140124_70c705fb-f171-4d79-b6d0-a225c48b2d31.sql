ALTER TABLE public.billing_preferences
ADD COLUMN IF NOT EXISTS receipt_from_name TEXT,
ADD COLUMN IF NOT EXISTS order_confirmation_from_name TEXT;

ALTER TABLE public.billing_preferences
DROP CONSTRAINT IF EXISTS billing_preferences_receipt_from_name_check;
ALTER TABLE public.billing_preferences
DROP CONSTRAINT IF EXISTS billing_preferences_order_confirmation_from_name_check;

ALTER TABLE public.billing_preferences
ADD CONSTRAINT billing_preferences_receipt_from_name_check
CHECK (receipt_from_name IS NULL OR char_length(trim(receipt_from_name)) BETWEEN 1 AND 80);

ALTER TABLE public.billing_preferences
ADD CONSTRAINT billing_preferences_order_confirmation_from_name_check
CHECK (order_confirmation_from_name IS NULL OR char_length(trim(order_confirmation_from_name)) BETWEEN 1 AND 80);