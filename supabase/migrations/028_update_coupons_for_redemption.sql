-- Update coupons table for redemption system compatibility

-- Add missing columns for redemption system
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_details TEXT,
ADD COLUMN IF NOT EXISTS redemption_type TEXT DEFAULT 'unlimited',
ADD COLUMN IF NOT EXISTS redeem_period TEXT,
ADD COLUMN IF NOT EXISTS qr_code_data TEXT,
ADD COLUMN IF NOT EXISTS redemption_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;

-- Migrate merchant text to business relationship where possible
-- (This would need to be done manually if you want to link existing coupons to businesses)

-- Create index on business_id for faster queries
CREATE INDEX IF NOT EXISTS idx_coupons_business_id ON public.coupons(business_id);

-- Copy description to discount_details if discount_details is null
UPDATE public.coupons
SET discount_details = description
WHERE discount_details IS NULL;

COMMENT ON COLUMN public.coupons.business_id IS 'Foreign key to businesses table (optional, fallback to merchant text)';
COMMENT ON COLUMN public.coupons.discount_details IS 'Detailed discount description (migrated from description)';
COMMENT ON COLUMN public.coupons.redemption_type IS 'unlimited or limited';
COMMENT ON COLUMN public.coupons.redeem_period IS 'daily, weekly, monthly, or yearly (for limited redemptions)';
COMMENT ON COLUMN public.coupons.qr_code_data IS 'QR code content for coupon';
COMMENT ON COLUMN public.coupons.redemption_count IS 'Total number of redemptions';
COMMENT ON COLUMN public.coupons.view_count IS 'Total number of views';
COMMENT ON COLUMN public.coupons.save_count IS 'Total number of saves/favorites';

