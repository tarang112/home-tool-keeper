ALTER TABLE public.receipt_email_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own receipt imports" ON public.receipt_email_imports;
DROP POLICY IF EXISTS "Users can create own receipt imports" ON public.receipt_email_imports;
DROP POLICY IF EXISTS "Users can update own receipt imports" ON public.receipt_email_imports;
DROP POLICY IF EXISTS "Users can delete own receipt imports" ON public.receipt_email_imports;

CREATE POLICY "Users can view own receipt imports"
ON public.receipt_email_imports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own receipt imports"
ON public.receipt_email_imports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipt imports"
ON public.receipt_email_imports
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipt imports"
ON public.receipt_email_imports
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.receipt_email_import_summaries
WITH (security_invoker = on)
AS
SELECT
  id,
  user_id,
  matched_email,
  sender_email,
  subject,
  store_name,
  order_number,
  order_date,
  status,
  source_type,
  file_name,
  file_type,
  subtotal_amount,
  tax_amount,
  shipping_amount,
  total_amount,
  created_at,
  updated_at
FROM public.receipt_email_imports;

GRANT SELECT ON public.receipt_email_import_summaries TO authenticated;