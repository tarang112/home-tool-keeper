-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN email text;

-- Backfill existing profiles with emails from auth.users
UPDATE public.profiles SET email = u.email
FROM auth.users u WHERE u.id = profiles.user_id;

-- Update the handle_new_user function to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;