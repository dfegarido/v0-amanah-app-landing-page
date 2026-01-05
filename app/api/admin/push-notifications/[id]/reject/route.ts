import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { createAuthenticatedClient } from '@/lib/supabase'

// PATCH /api/admin/push-notifications/[id]/reject - Reject push notification request
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

    // Get request body
    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return errorResponse('Rejection reason is required', 400)
    }

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

    // Update status to rejected
    const { data: updatedRequest, error: updateError } = await supabase
      .from('push_notification_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: authResult.user.id,
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      console.error('[Admin Push Notifications API] Error rejecting request:', updateError)
      return errorResponse('Failed to reject push notification', 500)
    }

    console.log('[Admin Push Notifications API] Rejected notification:', requestId, 'Reason:', reason)

    return successResponse({
      request: updatedRequest
    }, 'Push notification request rejected')

  } catch (error: any) {
    console.error('[Admin Push Notifications API] Reject error:', error)
    return errorResponse('Internal server error', 500)
  }
}

