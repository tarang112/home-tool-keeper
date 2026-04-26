CREATE TABLE IF NOT EXISTS public.landing_page_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT '/',
  source TEXT NOT NULL DEFAULT 'direct',
  medium TEXT NOT NULL DEFAULT 'none',
  campaign TEXT,
  referrer TEXT,
  session_id TEXT,
  device TEXT NOT NULL DEFAULT 'desktop',
  lead_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_page_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.landing_leads
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS medium TEXT,
  ADD COLUMN IF NOT EXISTS campaign TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS landing_page TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'landing_page_events_event_name_check'
  ) THEN
    ALTER TABLE public.landing_page_events
      ADD CONSTRAINT landing_page_events_event_name_check
      CHECK (event_name IN ('pageview', 'lead_submit'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_landing_page_events_source_created_at
  ON public.landing_page_events (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_page_events_event_created_at
  ON public.landing_page_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_page_events_session_id
  ON public.landing_page_events (session_id);
CREATE INDEX IF NOT EXISTS idx_landing_leads_source_created_at
  ON public.landing_leads (source, created_at DESC);

DROP POLICY IF EXISTS "Visitors can record landing analytics" ON public.landing_page_events;
DROP POLICY IF EXISTS "Admins can view landing analytics" ON public.landing_page_events;
DROP POLICY IF EXISTS "Admins can delete landing analytics" ON public.landing_page_events;

CREATE POLICY "Visitors can record landing analytics"
ON public.landing_page_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_name IN ('pageview', 'lead_submit')
  AND length(page) <= 300
  AND length(source) <= 100
  AND length(medium) <= 100
  AND (campaign IS NULL OR length(campaign) <= 150)
  AND (referrer IS NULL OR length(referrer) <= 500)
  AND (session_id IS NULL OR length(session_id) <= 100)
  AND length(device) <= 30
);

CREATE POLICY "Admins can view landing analytics"
ON public.landing_page_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete landing analytics"
ON public.landing_page_events
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
