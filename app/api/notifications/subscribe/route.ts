import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

interface PushSubscriptionRequest {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
}

/**
 * POST /api/notifications/subscribe
 * Subscribe a user to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const body = await parseRequestBody<PushSubscriptionRequest>(request)

    if (!body || !body.endpoint || !body.keys || !body.keys.p256dh || !body.keys.auth) {
      return errorResponse('Missing required fields: endpoint, keys.p256dh, keys.auth', 400)
    }

    const supabase = getServerSupabase(request)

    // Get user agent from headers
    const userAgent = request.headers.get('user-agent') || body.userAgent || null

    // Upsert subscription (update if exists, insert if new)
    const { data: subscription, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          user_agent: userAgent,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving push subscription:', error)
      return errorResponse('Failed to save push subscription', 500)
    }

    console.log('✅ Push subscription saved for user:', userId)
    return successResponse(subscription, 'Push subscription saved successfully')
  } catch (error: any) {
    console.error('Subscribe push error:', error)
    return errorResponse('Internal server error', 500)
  }
}

/**
 * DELETE /api/notifications/subscribe
 * Unsubscribe a user from push notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return errorResponse('Missing required parameter: endpoint', 400)
    }

    const supabase = getServerSupabase(request)

    // Delete subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)

    if (error) {
      console.error('Error deleting push subscription:', error)
      return errorResponse('Failed to delete push subscription', 500)
    }

    console.log('✅ Push subscription deleted for user:', userId)
    return successResponse({}, 'Push subscription deleted successfully')
  } catch (error: any) {
    console.error('Unsubscribe push error:', error)
    return errorResponse('Internal server error', 500)
  }
}

/**
 * GET /api/notifications/subscribe
 * Get user's push subscriptions
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const supabase = getServerSupabase(request)

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, user_agent, is_active, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching push subscriptions:', error)
      return errorResponse('Failed to fetch push subscriptions', 500)
    }

    return successResponse({ subscriptions: subscriptions || [] })
  } catch (error: any) {
    console.error('Get push subscriptions error:', error)
    return errorResponse('Internal server error', 500)
  }
}

