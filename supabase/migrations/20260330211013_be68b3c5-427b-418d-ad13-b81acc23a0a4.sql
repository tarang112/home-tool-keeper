
-- Remove the authenticated INSERT policy on notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
