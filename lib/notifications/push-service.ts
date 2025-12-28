/**
 * Push Notification Service
 * 
 * Handles sending browser push notifications using Web Push API.
 * Requires VAPID keys for authentication with push services.
 */

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// VAPID keys for Web Push authentication
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@amanah.app'

// Initialize web-push with VAPID keys
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
} else {
  console.warn('⚠️ VAPID keys not configured. Push notifications will not work.')
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  data?: any
  requireInteraction?: boolean
  silent?: boolean
}

export interface PushResult {
  success: boolean
  error?: string
}

/**
 * Send push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<PushResult> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return {
      success: false,
      error: 'VAPID keys not configured',
    }
  }

  try {
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/images/logo-20amanaah.png',
      badge: payload.badge || '/images/logo-20amanaah.png',
      image: payload.image,
      tag: payload.tag,
      data: payload.data || {},
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
    })

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      pushPayload,
      {
        TTL: 24 * 60 * 60, // 24 hours
      }
    )

    console.log('✅ Push notification sent:', subscription.endpoint.substring(0, 50) + '...')
    return { success: true }
  } catch (error: any) {
    console.error('❌ Push notification error:', error)

    // Handle specific error codes
    if (error.statusCode === 410) {
      // Subscription expired or no longer valid
      return {
        success: false,
        error: 'Subscription expired',
      }
    }

    if (error.statusCode === 404 || error.statusCode === 403) {
      // Invalid subscription
      return {
        success: false,
        error: 'Invalid subscription',
      }
    }

    return {
      success: false,
      error: error.message || 'Unknown error',
    }
  }
}

/**
 * Get all active push subscriptions for a user
 */
export async function getUserPushSubscriptions(
  userId: string
): Promise<PushSubscription[]> {
  try {
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching push subscriptions:', error)
      return []
    }

    return (
      subscriptions?.map((sub) => ({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      })) || []
    )
  } catch (error) {
    console.error('Exception fetching push subscriptions:', error)
    return []
  }
}

/**
 * Send push notification to all of a user's devices
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const subscriptions = await getUserPushSubscriptions(userId)

  if (subscriptions.length === 0) {
    // This is normal - user just hasn't subscribed yet
    // Don't log as warning, just return quietly
    return { sent: 0, failed: 0, errors: [] }
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  )

  const sent = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length
  const failed = results.length - sent

  const errors: string[] = []
  results.forEach((result, index) => {
    if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
      const error = result.status === 'rejected' 
        ? result.reason?.message 
        : result.value.error
      if (error) {
        errors.push(error)
        // If subscription expired or invalid, mark as inactive
        if (error.includes('expired') || error.includes('Invalid')) {
          deactivateSubscription(subscriptions[index].endpoint).catch(console.error)
        }
      }
    }
  })

  console.log(`✅ Push notifications sent: ${sent}/${subscriptions.length} for user ${userId}`)
  return { sent, failed, errors }
}

/**
 * Deactivate a push subscription (e.g., when it expires)
 */
async function deactivateSubscription(endpoint: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('endpoint', endpoint)
    console.log('🗑️ Deactivated expired subscription:', endpoint.substring(0, 50) + '...')
  } catch (error) {
    console.error('Error deactivating subscription:', error)
  }
}

/**
 * Get VAPID public key (for frontend subscription)
 */
export function getVapidPublicKey(): string {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID public key not configured')
  }
  return VAPID_PUBLIC_KEY
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}

