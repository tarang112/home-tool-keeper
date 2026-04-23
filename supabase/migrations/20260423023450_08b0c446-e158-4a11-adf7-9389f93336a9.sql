ALTER TABLE public.notification_preferences
ADD COLUMN warranty_reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[30, 14, 7, 3, 1, 0];