-- ============================================
-- Enable Realtime for Messages Table
-- ============================================

-- Enable Realtime for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Set REPLICA IDENTITY to FULL for UPDATE events to work properly
ALTER TABLE public.messages REPLICA IDENTITY FULL;

COMMENT ON TABLE public.messages IS 'Messages table with Realtime enabled for live updates';

