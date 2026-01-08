-- Migration: Add subscription_updated notification type
-- Date: 2026-01-08
-- Description: Adds notification type for when members update their subscription details

-- Add 'subscription_updated' to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'subscription_updated';

COMMENT ON TYPE notification_type IS 'Types of notifications: message_received, donation_confirmed, donation_failed, event_created, event_updated, subscription_created, subscription_cancelled, subscription_updated, payment_failed, admin_action';

