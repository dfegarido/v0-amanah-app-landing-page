import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'
import { onMessageCreated } from '@/lib/notifications/hooks'

interface CreateMessageRequest {
  recipient_id: string
  subject?: string
  body: string
  parent_message_id?: string
}

// POST /api/messages - Send a new message
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body = await parseRequestBody<CreateMessageRequest>(request)
    if (!body || !body.recipient_id || !body.body) {
      return errorResponse('Missing required fields: recipient_id and body', 400)
    }

    // Validate recipient exists
    const supabase = getServerSupabase(request)
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', body.recipient_id)
      .single()

    if (recipientError || !recipient) {
      return errorResponse('Recipient not found', 404)
    }

    // Validate parent message if provided
    if (body.parent_message_id) {
      const { data: parentMessage, error: parentError } = await supabase
        .from('messages')
        .select('id, recipient_id')
        .eq('id', body.parent_message_id)
        .single()

      if (parentError || !parentMessage) {
        return errorResponse('Parent message not found', 404)
      }

      // Ensure user is part of the parent message thread
      if (parentMessage.recipient_id !== authResult.user.id && 
          parentMessage.recipient_id !== body.recipient_id) {
        return errorResponse('Invalid parent message thread', 403)
      }
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: authResult.user.id,
        recipient_id: body.recipient_id,
        subject: body.subject || null,
        body: body.body,
        parent_message_id: body.parent_message_id || null,
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return errorResponse('Failed to create message', 500)
    }

    // Trigger notification hook
    try {
      await onMessageCreated({
        messageId: message.id,
        senderId: authResult.user.id,
        recipientId: body.recipient_id,
        subject: body.subject,
        body: body.body,
      })
    } catch (hookError) {
      // Don't fail the request if notification fails
      console.error('Error triggering notification hook:', hookError)
    }

    return successResponse(message, 'Message sent successfully')
  } catch (error: any) {
    console.error('Create message error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// GET /api/messages - List messages
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const supabase = getServerSupabase(request)
    const { searchParams } = new URL(request.url)

    // Query parameters
    const folder = searchParams.get('folder') || 'inbox' // 'inbox' | 'sent'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    const unreadOnly = searchParams.get('unread_only') === 'true'

    let query = supabase
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
        sender:users!messages_sender_id_fkey(id, name, email),
        recipient:users!messages_recipient_id_fkey(id, name, email)
      `)
      .order('created_at', { ascending: false })

    // Filter by folder (inbox or sent)
    if (folder === 'inbox') {
      query = query.eq('recipient_id', authResult.user.id)
    } else if (folder === 'sent') {
      query = query.eq('sender_id', authResult.user.id)
    } else {
      return errorResponse('Invalid folder. Use "inbox" or "sent"', 400)
    }

    // Filter unread only
    if (unreadOnly) {
      query = query.is('read_at', null)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: messages, error: messagesError } = await query

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return errorResponse('Failed to fetch messages', 500)
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })

    if (folder === 'inbox') {
      countQuery = countQuery.eq('recipient_id', authResult.user.id)
    } else {
      countQuery = countQuery.eq('sender_id', authResult.user.id)
    }

    if (unreadOnly) {
      countQuery = countQuery.is('read_at', null)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting messages:', countError)
    }

    return successResponse({
      messages: messages || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Get messages error:', error)
    return errorResponse('Internal server error', 500)
  }
}
