import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

// PATCH /api/messages/[id]/read - Mark message as read
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const supabase = getServerSupabase(request)

    // Verify message exists and user is recipient
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, recipient_id')
      .eq('id', params.id)
      .single()

    if (messageError || !message) {
      return errorResponse('Message not found', 404)
    }

    // Only recipient can mark as read (or admin)
    if (message.recipient_id !== authResult.user.id && authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Only recipient can mark message as read', 403)
    }

    // Update read_at timestamp
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating message:', updateError)
      return errorResponse('Failed to mark message as read', 500)
    }

    return successResponse(updatedMessage, 'Message marked as read')
  } catch (error: any) {
    console.error('Mark message as read error:', error)
    return errorResponse('Internal server error', 500)
  }
}

