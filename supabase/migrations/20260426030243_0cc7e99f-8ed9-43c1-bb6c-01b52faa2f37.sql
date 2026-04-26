ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS restock_in_app boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS restock_email boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS restock_push boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS expiration_in_app boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS expiration_email boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS expiration_push boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS expiration_reminder_days integer[] NOT NULL DEFAULT ARRAY[7, 3, 1, 0];