import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

// GET /api/notifications - List user notifications
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const supabase = getServerSupabase(request)
    const { searchParams } = new URL(request.url)

    // Query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const type = searchParams.get('type') // Filter by notification type

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', authResult.user.id)
      .order('created_at', { ascending: false })

    // Filter unread only
    if (unreadOnly) {
      query = query.is('read_at', null)
    }

    // Filter by type
    if (type) {
      query = query.eq('type', type)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: notifications, error: notificationsError } = await query

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError)
      return errorResponse('Failed to fetch notifications', 500)
    }

    // Get total count
    let countQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authResult.user.id)

    if (unreadOnly) {
      countQuery = countQuery.is('read_at', null)
    }

    if (type) {
      countQuery = countQuery.eq('type', type)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting notifications:', countError)
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authResult.user.id)
      .is('read_at', null)

    return successResponse({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Get notifications error:', error)
    return errorResponse('Internal server error', 500)
  }
}

