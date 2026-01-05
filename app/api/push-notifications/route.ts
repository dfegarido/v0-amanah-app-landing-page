import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { createAuthenticatedClient } from '@/lib/supabase'

// GET /api/push-notifications - Get user's push notification requests
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return errorResponse('No authentication token provided', 401)
    }

    const supabase = createAuthenticatedClient(token)

    // Fetch user's push notification requests
    const { data: requests, error } = await supabase
      .from('push_notification_requests')
      .select('*')
      .eq('user_id', authResult.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Push Notifications API] Error fetching requests:', error)
      return errorResponse('Failed to fetch push notification requests', 500)
    }

    return successResponse({
      requests: requests || []
    })

  } catch (error: any) {
    console.error('[Push Notifications API] GET error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST /api/push-notifications - Create new push notification request
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return errorResponse('No authentication token provided', 401)
    }

    const supabase = createAuthenticatedClient(token)

    // Parse request body
    const body = await request.json()
    const {
      mosque_subscription_id,
      mosque_code,
      mosque_name,
      title,
      message,
      scheduled_date,
      scheduled_time,
      timezone
    } = body

    // Validation
    if (!mosque_subscription_id || !mosque_code || !mosque_name) {
      return errorResponse('Mosque information is required', 400)
    }

    if (!title || !message) {
      return errorResponse('Title and message are required', 400)
    }

    if (!scheduled_date || !scheduled_time) {
      return errorResponse('Scheduled date and time are required', 400)
    }

    // Verify the mosque subscription belongs to the user (security check)
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, type, user_id')
      .eq('id', mosque_subscription_id)
      .eq('user_id', authResult.user.id)  // ← Ensures user owns this mosque
      .eq('type', 'mosque')
      .single()

    if (subError || !subscription) {
      console.error('[Push Notifications API] Subscription verification error:', subError)
      return errorResponse('Invalid mosque subscription or you do not own this mosque', 403)
    }

    // Check if scheduled date is at least 7 days in advance
    const scheduledDate = new Date(scheduled_date)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    if (scheduledDate < sevenDaysFromNow) {
      return errorResponse('Push notifications must be scheduled at least 7 days in advance', 400)
    }

    // Check 1 per month limit - get last approved/sent request
    const { data: recentRequests, error: recentError } = await supabase
      .from('push_notification_requests')
      .select('scheduled_date, status')
      .eq('mosque_subscription_id', mosque_subscription_id)
      .in('status', ['approved', 'sent'])
      .order('scheduled_date', { ascending: false })
      .limit(1)

    if (recentError) {
      console.error('[Push Notifications API] Error checking recent requests:', recentError)
      // Don't fail the request, just log the error
    }

    if (recentRequests && recentRequests.length > 0) {
      const lastRequestDate = new Date(recentRequests[0].scheduled_date)
      const daysSinceLastRequest = Math.floor((scheduledDate.getTime() - lastRequestDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceLastRequest < 30) {
        const daysUntilNextRequest = 30 - daysSinceLastRequest
        return errorResponse(
          `You can only request 1 push notification per month. Next request available in ${daysUntilNextRequest} days.`,
          400
        )
      }
    }

    // Create the push notification request
    const { data: newRequest, error: insertError } = await supabase
      .from('push_notification_requests')
      .insert({
        user_id: authResult.user.id,
        mosque_subscription_id,
        mosque_code,
        mosque_name,
        title,
        message,
        scheduled_date,
        scheduled_time,
        timezone: timezone || 'America/New_York',
        status: 'pending',
        requested_by: authResult.user.email,
        requested_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Push Notifications API] Error creating request:', insertError)
      
      // Check if it's the validation error from the trigger
      if (insertError.message.includes('7 days in advance')) {
        return errorResponse('Push notifications must be scheduled at least 7 days in advance', 400)
      }
      if (insertError.message.includes('per month')) {
        return errorResponse('You can only request 1 push notification per month', 400)
      }
      
      return errorResponse('Failed to create push notification request', 500)
    }

    console.log('[Push Notifications API] Created request:', newRequest.id)

    return successResponse({
      request: newRequest
    }, 'Push notification request submitted successfully. It will be reviewed by admin.')

  } catch (error: any) {
    console.error('[Push Notifications API] POST error:', error)
    return errorResponse('Internal server error', 500)
  }
}

