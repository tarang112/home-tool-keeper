ALTER TABLE public.notification_preferences
ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';