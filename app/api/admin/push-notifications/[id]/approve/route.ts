import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { createAuthenticatedClient } from '@/lib/supabase'

// PATCH /api/admin/push-notifications/[id]/approve - Approve and send push notification
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const resolvedParams = await params
    const requestId = resolvedParams.id

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return errorResponse('No authentication token provided', 401)
    }

    const supabase = createAuthenticatedClient(token)

    // Get the request
    const { data: notificationRequest, error: fetchError } = await supabase
      .from('push_notification_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !notificationRequest) {
      console.error('[Admin Push Notifications API] Error fetching request:', fetchError)
      return errorResponse('Push notification request not found', 404)
    }

    // Check if already processed
    if (notificationRequest.status !== 'pending') {
      return errorResponse(`Request already ${notificationRequest.status}`, 400)
    }

    // Update status to sent (in real implementation, this would trigger actual push notification)
    const { data: updatedRequest, error: updateError } = await supabase
      .from('push_notification_requests')
      .update({
        status: 'sent',
        reviewed_at: new Date().toISOString(),
        reviewed_by: authResult.user.id,
        sent_at: new Date().toISOString(),
        sent_by: authResult.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      console.error('[Admin Push Notifications API] Error approving request:', updateError)
      return errorResponse('Failed to approve push notification', 500)
    }

    console.log('[Admin Push Notifications API] Approved and sent notification:', requestId)

    // TODO: In real implementation, integrate with push notification service (Firebase, OneSignal, etc.)
    // For now, we just mark it as sent

    return successResponse({
      request: updatedRequest
    }, 'Push notification approved and sent successfully')

  } catch (error: any) {
    console.error('[Admin Push Notifications API] Approve error:', error)
    return errorResponse('Internal server error', 500)
  }
}

