-- Create push notification request status enum
CREATE TYPE push_notification_status AS ENUM ('pending', 'approved', 'sent', 'rejected', 'cancelled');

-- Create push_notification_requests table
CREATE TABLE public.push_notification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Mosque information
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  mosque_subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  mosque_code INTEGER NOT NULL,
  mosque_name TEXT NOT NULL,
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  
  -- Status tracking
  status push_notification_status DEFAULT 'pending' NOT NULL,
  
  -- Request tracking
  requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  requested_by TEXT NOT NULL, -- Email of requester
  
  -- Approval/Rejection
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Admin who reviewed
  rejection_reason TEXT,
  
  -- Sending tracking
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Admin who sent
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_push_notif_requests_user_id ON public.push_notification_requests(user_id);
CREATE INDEX idx_push_notif_requests_mosque_sub_id ON public.push_notification_requests(mosque_subscription_id);
CREATE INDEX idx_push_notif_requests_mosque_code ON public.push_notification_requests(mosque_code);
CREATE INDEX idx_push_notif_requests_status ON public.push_notification_requests(status);
CREATE INDEX idx_push_notif_requests_scheduled_date ON public.push_notification_requests(scheduled_date);
CREATE INDEX idx_push_notif_requests_created_at ON public.push_notification_requests(created_at);

-- Create trigger to update updated_at
CREATE TRIGGER update_push_notif_requests_updated_at 
  BEFORE UPDATE ON public.push_notification_requests
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.push_notification_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own push notification requests
CREATE POLICY "Users can view own push notification requests"
  ON public.push_notification_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create push notification requests for their own mosques
CREATE POLICY "Users can create push notification requests for own mosques"
  ON public.push_notification_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending requests (e.g., to cancel)
CREATE POLICY "Users can update own pending requests"
  ON public.push_notification_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all push notification requests
CREATE POLICY "Admins can view all push notification requests"
  ON public.push_notification_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Admins can update all push notification requests (approve/reject/send)
CREATE POLICY "Admins can update all push notification requests"
  ON public.push_notification_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Function to check if mosque can request push notification (1 per month limit)
CREATE OR REPLACE FUNCTION can_request_push_notification(
  p_mosque_subscription_id UUID,
  p_scheduled_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  last_request_date DATE;
  days_since_last_request INTEGER;
BEGIN
  -- Get the most recent approved or sent request for this mosque
  SELECT scheduled_date INTO last_request_date
  FROM public.push_notification_requests
  WHERE mosque_subscription_id = p_mosque_subscription_id
    AND status IN ('approved', 'sent')
  ORDER BY scheduled_date DESC
  LIMIT 1;
  
  -- If no previous requests, allow
  IF last_request_date IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Calculate days since last request
  days_since_last_request := p_scheduled_date - last_request_date;
  
  -- Must be at least 30 days since last request
  RETURN days_since_last_request >= 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate push notification request
CREATE OR REPLACE FUNCTION validate_push_notification_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if scheduled date is at least 7 days in the future
  IF NEW.scheduled_date < CURRENT_DATE + INTERVAL '7 days' THEN
    RAISE EXCEPTION 'Push notifications must be scheduled at least 7 days in advance';
  END IF;
  
  -- Check 1 per month limit (only on INSERT)
  IF TG_OP = 'INSERT' THEN
    IF NOT can_request_push_notification(NEW.mosque_subscription_id, NEW.scheduled_date) THEN
      RAISE EXCEPTION 'Only 1 push notification request allowed per month per mosque';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER validate_push_notification_request_trigger
  BEFORE INSERT ON public.push_notification_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_push_notification_request();

-- Comments for documentation
COMMENT ON TABLE public.push_notification_requests IS 'Stores push notification requests from mosques (1 per month limit, must be scheduled 7+ days in advance)';
COMMENT ON COLUMN public.push_notification_requests.status IS 'pending: awaiting admin review, approved: approved but not sent, sent: notification sent, rejected: admin rejected, cancelled: user cancelled';
COMMENT ON FUNCTION can_request_push_notification IS 'Checks if a mosque can request a push notification (enforces 1 per 30 days limit)';

