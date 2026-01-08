import { NextRequest } from 'next/server'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

// GET /api/admin/change-requests - List all change requests
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Verify user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized. Admin access required.', 403)
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'approved', 'rejected', or null for all
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const supabaseAdmin = getSupabaseAdmin()

    // Build query
    let query = supabaseAdmin
      .from('subscription_change_requests')
      .select(`
        *,
        user:user_id (id, email, name),
        reviewer:reviewed_by (id, email, name),
        subscription:subscription_id (
          id,
          type,
          status,
          current_period_start,
          current_period_end
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: changeRequests, error: fetchError, count } = await query

    if (fetchError) {
      console.error('Error fetching change requests:', fetchError)
      return errorResponse('Failed to fetch change requests', 500)
    }

    return successResponse({
      changeRequests: changeRequests || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Get change requests error:', error)
    return errorResponse('Internal server error', 500)
  }
}

