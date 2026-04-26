CREATE TABLE public.visitor_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page TEXT NOT NULL,
  device TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own visitor logs"
ON public.visitor_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own visitor logs"
ON public.visitor_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own visitor logs"
ON public.visitor_logs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX visitor_logs_user_created_at_idx
ON public.visitor_logs (user_id, created_at DESC);

CREATE INDEX visitor_logs_user_page_idx
ON public.visitor_logs (user_id, page);