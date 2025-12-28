-- ============================================
-- Messages Table - In-Website Messaging System
-- ============================================

-- Create messages table for user-to-user and user-to-admin messaging
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Sender and recipient
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Message content
  subject TEXT,
  body TEXT NOT NULL,
  
  -- Threading support (for replies)
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  
  -- Read status
  read_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT sender_not_recipient CHECK (sender_id != recipient_id)
);

-- Create indexes for performance
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX idx_messages_parent_message_id ON public.messages(parent_message_id);
CREATE INDEX idx_messages_read_at ON public.messages(read_at);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update their sent messages (before recipient reads)
CREATE POLICY "Users can update own sent messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id AND read_at IS NULL);

-- Recipients can mark messages as read
CREATE POLICY "Recipients can mark messages as read"
  ON public.messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Admins can manage all messages
CREATE POLICY "Admins can manage all messages"
  ON public.messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.messages IS 'Stores messages between users and admins';
COMMENT ON COLUMN public.messages.parent_message_id IS 'Reference to parent message for threaded conversations';
