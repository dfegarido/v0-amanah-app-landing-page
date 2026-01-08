import { NextRequest } from 'next/server'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

// GET /api/subscriptions/[id]/change-requests - Get change requests for a subscription
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const { id } = await params
    const subscriptionId = id
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'approved', 'rejected', or null for all

    const supabase = getServerSupabase(request)

    // Verify subscription belongs to user
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id')
      .eq('id', subscriptionId)
      .eq('user_id', authResult.user.id)
      .single()

    if (subError || !subscription) {
      console.log('[Change Requests API] Subscription not found or access denied:', subError)
      // Return empty array instead of error to avoid breaking the UI
      return successResponse([])
    }

    // Build query
    let query = supabase
      .from('subscription_change_requests')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: changeRequests, error: fetchError } = await query

    if (fetchError) {
      console.error('[Change Requests API] Error fetching change requests:', fetchError)
      // If the table doesn't exist yet (migration not run), return empty array
      if (fetchError.code === '42P01') {
        console.log('[Change Requests API] Table does not exist yet (migration not run)')
        return successResponse([])
      }
      return successResponse([]) // Return empty array instead of error to avoid breaking UI
    }

    return successResponse(changeRequests || [])
  } catch (error: any) {
    console.error('Get subscription change requests error:', error)
    return errorResponse('Internal server error', 500)
  }
}

