-- ============================================
-- Activity Logs Table - Admin Activity Tracking
-- ============================================

-- Create activity action type enum
CREATE TYPE activity_action AS ENUM (
  'business_verified',
  'business_rejected',
  'business_deactivated',
  'mosque_verified',
  'mosque_rejected',
  'mosque_deactivated',
  'subscription_approved',
  'subscription_rejected',
  'subscription_cancelled',
  'user_created',
  'user_updated',
  'user_deleted',
  'donation_refunded',
  'donation_updated',
  'settings_updated',
  'report_generated',
  'other'
);

-- Create activity logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who performed the action
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  admin_name TEXT,
  
  -- What action was performed
  action activity_action NOT NULL,
  action_description TEXT NOT NULL,
  
  -- What entity was affected
  entity_type TEXT, -- 'business', 'mosque', 'subscription', 'user', 'donation', etc.
  entity_id UUID,
  entity_name TEXT, -- Name of the entity for easier reference
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_activity_logs_admin_id ON public.activity_logs(admin_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX idx_activity_logs_entity_id ON public.activity_logs(entity_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "Admins can view activity logs"
  ON public.activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert activity logs (via service role or admin)
CREATE POLICY "System can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to create activity log entry
CREATE OR REPLACE FUNCTION public.create_activity_log(
  p_admin_id UUID,
  p_action activity_action,
  p_action_description TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.activity_logs AS $$
DECLARE
  v_admin_email TEXT;
  v_admin_name TEXT;
  v_log public.activity_logs;
BEGIN
  -- Fetch admin details
  SELECT email, name INTO v_admin_email, v_admin_name
  FROM public.users
  WHERE id = p_admin_id;
  
  -- Insert activity log
  INSERT INTO public.activity_logs (
    admin_id,
    admin_email,
    admin_name,
    action,
    action_description,
    entity_type,
    entity_id,
    entity_name,
    metadata
  )
  VALUES (
    p_admin_id,
    v_admin_email,
    v_admin_name,
    p_action,
    p_action_description,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_metadata
  )
  RETURNING * INTO v_log;
  
  RETURN v_log;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON TABLE public.activity_logs IS 'Tracks all administrative actions for audit and transparency';
COMMENT ON FUNCTION public.create_activity_log IS 'Creates an activity log entry for admin actions';

