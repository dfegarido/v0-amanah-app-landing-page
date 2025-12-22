-- Create admin_settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- General Settings
  platform_name TEXT DEFAULT 'Amanah',
  support_email TEXT DEFAULT 'support@amanah.app',
  contact_phone TEXT DEFAULT '+1 (555) 123-4567',
  website_url TEXT DEFAULT 'https://amanah.app',
  
  -- Pricing Settings
  pricing_mosque DECIMAL(10,2) DEFAULT 100.00,
  pricing_business DECIMAL(10,2) DEFAULT 10.00,
  pricing_coupon DECIMAL(10,2) DEFAULT 10.00,
  pricing_nonprofit DECIMAL(10,2) DEFAULT 50.00,
  
  -- Revenue Distribution
  mosque_kickback_percentage DECIMAL(5,2) DEFAULT 10.00,
  education_fund_percentage DECIMAL(5,2) DEFAULT 15.00,
  
  -- Notification Settings
  notification_email TEXT DEFAULT 'admin@amanah.app',
  notify_new_subscription BOOLEAN DEFAULT true,
  notify_payment_failed BOOLEAN DEFAULT true,
  notify_subscription_cancelled BOOLEAN DEFAULT true,
  notify_push_requests BOOLEAN DEFAULT true,
  notify_member_updates BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure only one settings row exists
  CONSTRAINT single_row CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

-- Insert default settings
INSERT INTO public.admin_settings (
  id,
  platform_name,
  support_email,
  contact_phone,
  website_url,
  pricing_mosque,
  pricing_business,
  pricing_coupon,
  pricing_nonprofit,
  mosque_kickback_percentage,
  education_fund_percentage,
  notification_email,
  notify_new_subscription,
  notify_payment_failed,
  notify_subscription_cancelled,
  notify_push_requests,
  notify_member_updates
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Amanah',
  'support@amanah.app',
  '+1 (555) 123-4567',
  'https://amanah.app',
  100.00,
  10.00,
  10.00,
  50.00,
  10.00,
  15.00,
  'josh@mobileappcity.com',
  true,
  true,
  true,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "Admins can view settings"
  ON public.admin_settings
  FOR SELECT
  USING (is_admin());

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON public.admin_settings
  FOR UPDATE
  USING (is_admin());

-- Add trigger to update updated_at
CREATE TRIGGER update_admin_settings_updated_at 
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.admin_settings IS 'Stores platform-wide admin settings. Only one row should exist.';

