DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notification_preferences_user_id_key'
      AND conrelid = 'public.notification_preferences'::regclass
  ) THEN
    ALTER TABLE public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);
  END IF;
END $$;