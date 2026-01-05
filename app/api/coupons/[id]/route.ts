import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse } from '@/lib/api-helpers'

// GET single coupon and increment view count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const couponId = resolvedParams.id

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch coupon details
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select(`
        *,
        subscription:subscriptions!inner(
          user_id,
          app_status,
          status
        )
      `)
      .eq('id', couponId)
      .single()

    if (error || !coupon) {
      return errorResponse('Coupon not found', 404)
    }

    // Check if coupon is active and within date range
    const today = new Date().toISOString().split('T')[0]
    if (coupon.status !== 'active' || 
        coupon.start_date > today || 
        coupon.end_date < today) {
      return errorResponse('Coupon is not available', 400)
    }

    // Increment view count
    await supabase
      .from('coupons')
      .update({ 
        view_count: (coupon.view_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', couponId)

    return successResponse({ coupon })
  } catch (error: any) {
    console.error('[Coupon Details API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

