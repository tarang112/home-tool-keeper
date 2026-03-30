
-- Recreate view with SECURITY INVOKER to use the querying user's permissions
DROP VIEW IF EXISTS public.member_profiles;
CREATE VIEW public.member_profiles WITH (security_invoker = on) AS
  SELECT user_id, display_name, avatar_url FROM public.profiles;

GRANT SELECT ON public.member_profiles TO authenticated;
