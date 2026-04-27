ALTER TABLE public.receipt_email_imports
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'pasted_email',
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric,
  ADD COLUMN IF NOT EXISTS tax_amount numeric,
  ADD COLUMN IF NOT EXISTS shipping_amount numeric,
  ADD COLUMN IF NOT EXISTS total_amount numeric;