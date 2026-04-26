ALTER TABLE public.visitor_logs
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS ip_hash TEXT;

CREATE INDEX IF NOT EXISTS visitor_logs_user_session_idx
ON public.visitor_logs (user_id, session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS visitor_logs_user_ip_hash_idx
ON public.visitor_logs (user_id, ip_hash);