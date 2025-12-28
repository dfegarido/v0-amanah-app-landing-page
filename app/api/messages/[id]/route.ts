import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/messages/[id] - Get message details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const supabase = getServerSupabase(request)

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        subject,
        body,
        parent_message_id,
        read_at,
        created_at,
        updated_at,
        sender:users!messages_sender_id_fkey(id, name, email),
        recipient:users!messages_recipient_id_fkey(id, name, email)
      `)
      .eq('id', params.id)
      .single()

    if (messageError || !message) {
      return errorResponse('Message not found', 404)
    }

    // Verify user has access to this message
    if (message.sender_id !== authResult.user.id && 
        message.recipient_id !== authResult.user.id &&
        authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized', 403)
    }

    // If user is recipient and message is unread, mark as read
    if (message.recipient_id === authResult.user.id && !message.read_at) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', params.id)
      
      // Update the message object
      message.read_at = new Date().toISOString()
    }

    return successResponse(message)
  } catch (error: any) {
    console.error('Get message error:', error)
    return errorResponse('Internal server error', 500)
  }
}
