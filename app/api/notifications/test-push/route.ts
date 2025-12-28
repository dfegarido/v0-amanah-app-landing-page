import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { sendPushToUser, isPushConfigured } from '@/lib/notifications/push-service'

/**
 * POST /api/notifications/test-push
 * Send a test push notification to the current user
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id

    // Check if push is configured
    if (!isPushConfigured()) {
      return errorResponse('Push notifications are not configured. Please set VAPID keys.', 503)
    }

    // Send test push notification
    const result = await sendPushToUser(userId, {
      title: 'Test Notification',
      body: 'This is a test push notification from Amanah!',
      icon: '/images/logo-20amanaah.png',
      badge: '/images/logo-20amanaah.png',
      tag: 'test',
      data: {
        url: '/member',
        test: true,
      },
    })

    if (result.sent === 0) {
      return errorResponse(
        `No active push subscriptions found for user. ${result.errors.length > 0 ? 'Errors: ' + result.errors.join(', ') : ''}`,
        404
      )
    }

    return successResponse({
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    }, `Test push notification sent to ${result.sent} device(s)`)
  } catch (error: any) {
    console.error('Test push error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

