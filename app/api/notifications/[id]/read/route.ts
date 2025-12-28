import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

// PATCH /api/notifications/[id]/read - Mark notification as read
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const supabase = getServerSupabase(request)

    // Verify notification exists and belongs to user
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id, user_id, read_at')
      .eq('id', params.id)
      .single()

    if (notificationError || !notification) {
      return errorResponse('Notification not found', 404)
    }

    // Verify ownership
    if (notification.user_id !== authResult.user.id) {
      return errorResponse('Unauthorized', 403)
    }

    // Already read?
    if (notification.read_at) {
      return successResponse(notification, 'Notification already marked as read')
    }

    // Update read_at timestamp
    const { data: updatedNotification, error: updateError } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating notification:', updateError)
      return errorResponse('Failed to mark notification as read', 500)
    }

    return successResponse(updatedNotification, 'Notification marked as read')
  } catch (error: any) {
    console.error('Mark notification as read error:', error)
    return errorResponse('Internal server error', 500)
  }
}
