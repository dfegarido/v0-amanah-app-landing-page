import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

// GET - Get analytics for a coupon (coupon owner only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const resolvedParams = await params
    const couponId = resolvedParams.id

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const periodDays = parseInt(period)

    const supabase = getServerSupabase(request)

    // Check if user owns this coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select(`
        *,
        subscription:subscriptions!inner(user_id)
      `)
      .eq('id', couponId)
      .single()

    if (couponError || !coupon) {
      return errorResponse('Coupon not found', 404)
    }

    if (coupon.subscription.user_id !== userId) {
      return errorResponse('You are not authorized to view this coupon analytics', 403)
    }

    // Get basic stats
    const stats = {
      totalViews: coupon.view_count || 0,
      totalSaves: coupon.save_count || 0,
      totalRedemptions: coupon.redemption_count || 0,
      conversionRate: coupon.view_count > 0 
        ? ((coupon.redemption_count || 0) / coupon.view_count * 100).toFixed(2)
        : '0.00'
    }

    // Get redemptions in the period
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - periodDays)

    const { data: redemptions, error: redemptionsError } = await supabase
      .from('coupon_redemptions')
      .select('redeemed_at, status, user_id')
      .eq('coupon_id', couponId)
      .gte('redeemed_at', periodStart.toISOString())
      .order('redeemed_at', { ascending: false })

    if (redemptionsError) {
      console.error('[Analytics API] Error fetching redemptions:', redemptionsError)
    }

    // Calculate daily redemptions for chart
    const dailyRedemptions: Record<string, number> = {}
    redemptions?.forEach((redemption) => {
      const date = redemption.redeemed_at.split('T')[0]
      dailyRedemptions[date] = (dailyRedemptions[date] || 0) + 1
    })

    // Count unique users
    const uniqueUsers = new Set(redemptions?.map(r => r.user_id) || []).size

    // Redemptions by status
    const statusCounts = {
      completed: redemptions?.filter(r => r.status === 'completed').length || 0,
      pending: redemptions?.filter(r => r.status === 'pending').length || 0,
      expired: redemptions?.filter(r => r.status === 'expired').length || 0,
      cancelled: redemptions?.filter(r => r.status === 'cancelled').length || 0
    }

    return successResponse({
      coupon: {
        id: coupon.id,
        title: coupon.title,
        startDate: coupon.start_date,
        endDate: coupon.end_date,
        status: coupon.status
      },
      stats,
      period: {
        days: periodDays,
        startDate: periodStart.toISOString(),
        endDate: new Date().toISOString()
      },
      metrics: {
        uniqueUsers,
        redemptionsByStatus: statusCounts,
        dailyRedemptions: Object.entries(dailyRedemptions).map(([date, count]) => ({
          date,
          count
        })).sort((a, b) => a.date.localeCompare(b.date))
      }
    })
  } catch (error: any) {
    console.error('[Analytics API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

