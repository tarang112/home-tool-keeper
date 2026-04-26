ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS dedupe_key text;

UPDATE public.notifications
SET dedupe_key = user_id::text || ':' || COALESCE(item_id::text, id::text) || ':' || created_at::date::text
WHERE dedupe_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_key_idx
ON public.notifications (user_id, dedupe_key)
WHERE dedupe_key IS NOT NULL;