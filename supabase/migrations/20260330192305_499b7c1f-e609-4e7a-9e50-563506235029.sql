
-- Create a view that omits email for cross-member reads
CREATE VIEW public.member_profiles AS
  SELECT user_id, display_name, avatar_url FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.member_profiles TO authenticated;
