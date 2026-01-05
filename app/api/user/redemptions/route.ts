import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

// GET - Get user's redemption history
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status') || 'all' // all, completed, pending, expired
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = getServerSupabase(request)

    // Build query
    let query = supabase
      .from('coupon_redemptions')
      .select(`
        *,
        coupon:coupons(
          id,
          title,
          description,
          discount_amount,
          discount_percentage,
          start_date,
          end_date,
          merchant,
          address,
          phone
        )
      `)
      .eq('user_id', userId)
      .order('redeemed_at', { ascending: false })

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: redemptions, error } = await query

    if (error) {
      console.error('[User Redemptions API] Error:', error)
      return errorResponse('Failed to fetch redemptions', 500)
    }

    // Get total count
    let countQuery = supabase
      .from('coupon_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    const { count: totalCount } = await countQuery

    return successResponse({
      redemptions: redemptions || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    })
  } catch (error: any) {
    console.error('[User Redemptions API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

