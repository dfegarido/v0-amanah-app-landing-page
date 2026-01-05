import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

// GET - Get user's saved/favorited coupons
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = getServerSupabase(request)

    // Get saved coupons with full coupon details
    const { data: savedCoupons, error } = await supabase
      .from('user_saved_coupons')
      .select(`
        saved_at,
        coupon:coupons(*)
      `)
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Saved Coupons API] Error:', error)
      return errorResponse('Failed to fetch saved coupons', 500)
    }

    // Filter out expired coupons and map to clean format
    const today = new Date().toISOString().split('T')[0]
    const activeCoupons = savedCoupons
      ?.filter(sc => {
        const coupon = sc.coupon
        return coupon && 
               coupon.status === 'active' && 
               coupon.end_date >= today
      })
      .map(sc => ({
        savedAt: sc.saved_at,
        coupon: sc.coupon
      })) || []

    // Get total count
    const { count: totalCount } = await supabase
      .from('user_saved_coupons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    return successResponse({
      savedCoupons: activeCoupons,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    })
  } catch (error: any) {
    console.error('[Saved Coupons API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

