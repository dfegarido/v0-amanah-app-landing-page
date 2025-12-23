-- Add notification preferences to users table

-- Add notification preference columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS payment_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS monthly_reports BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.users.email_notifications IS 'Receive emails about account activity';
COMMENT ON COLUMN public.users.payment_reminders IS 'Get notified before upcoming payments';
COMMENT ON COLUMN public.users.monthly_reports IS 'Receive monthly summary of earnings and activity';
