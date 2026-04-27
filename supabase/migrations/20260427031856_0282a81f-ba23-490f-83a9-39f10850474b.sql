CREATE TABLE IF NOT EXISTS public.receipt_email_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  matched_email text NOT NULL,
  sender_email text,
  subject text,
  email_content text NOT NULL,
  store_name text,
  order_number text,
  order_date date,
  parsed_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'parsed',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.receipt_email_imports ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_receipt_email_imports_user_created
ON public.receipt_email_imports (user_id, created_at DESC);

CREATE TRIGGER update_receipt_email_imports_updated_at
BEFORE UPDATE ON public.receipt_email_imports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();