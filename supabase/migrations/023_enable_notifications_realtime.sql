-- Enable Realtime for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Set REPLICA IDENTITY to FULL for UPDATE events to work properly
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

