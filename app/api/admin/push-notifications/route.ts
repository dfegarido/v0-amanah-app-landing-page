import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { createAuthenticatedClient } from '@/lib/supabase'

// GET /api/admin/push-notifications - Get all push notification requests (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return errorResponse('No authentication token provided', 401)
    }

    const supabase = createAuthenticatedClient(token)

    // Fetch all push notification requests
    const { data: requests, error } = await supabase
      .from('push_notification_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Admin Push Notifications API] Error fetching requests:', error)
      return errorResponse('Failed to fetch push notification requests', 500)
    }

    console.log('[Admin Push Notifications API] Fetched requests:', requests?.length || 0)

    return successResponse({
      requests: requests || []
    })

  } catch (error: any) {
    console.error('[Admin Push Notifications API] GET error:', error)
    return errorResponse('Internal server error', 500)
  }
}

