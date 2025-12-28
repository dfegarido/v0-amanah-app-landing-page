-- ============================================
-- Notifications Table - Notification System
-- ============================================

-- Create notification types enum
CREATE TYPE notification_type AS ENUM (
  'message_received',
  'donation_confirmed',
  'donation_failed',
  'event_created',
  'event_updated',
  'subscription_created',
  'subscription_cancelled',
  'payment_failed',
  'admin_action'
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User who receives the notification
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification details
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Read status
  read_at TIMESTAMPTZ,
  
  -- Additional metadata (flexible JSON for different notification types)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Link to related entity (optional)
  related_entity_type TEXT, -- 'message', 'donation', 'event', etc.
  related_entity_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_id_read_at ON public.notifications(user_id, read_at);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_related_entity ON public.notifications(related_entity_type, related_entity_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- System can create notifications (via service role or function)
-- We'll create a function for this that runs with SECURITY DEFINER
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true); -- Will be restricted by function permissions

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to create notification (to be used by hooks)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL
)
RETURNS public.notifications AS $$
DECLARE
  v_notification public.notifications;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    related_entity_type,
    related_entity_id
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_metadata,
    p_related_entity_type,
    p_related_entity_id
  )
  RETURNING * INTO v_notification;
  
  RETURN v_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.notifications IS 'Stores notifications for users';
COMMENT ON FUNCTION public.create_notification IS 'Creates a notification record. Can be called by API or triggers.';

