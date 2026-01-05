import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

// POST - Save coupon to favorites
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const resolvedParams = await params
    const couponId = resolvedParams.id

    const supabase = getServerSupabase(request)

    // Check if coupon exists
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('id')
      .eq('id', couponId)
      .single()

    if (couponError || !coupon) {
      return errorResponse('Coupon not found', 404)
    }

    // Save coupon (ignore if already saved)
    const { error: saveError } = await supabase
      .from('user_saved_coupons')
      .upsert({
        user_id: userId,
        coupon_id: couponId,
        saved_at: new Date().toISOString()
      })

    if (saveError) {
      console.error('[Save Coupon API] Error:', saveError)
      return errorResponse('Failed to save coupon', 500)
    }

    // Increment save count on coupon
    const { data: currentCoupon } = await supabase
      .from('coupons')
      .select('save_count')
      .eq('id', couponId)
      .single()
    
    if (currentCoupon) {
      await supabase
        .from('coupons')
        .update({
          save_count: (currentCoupon.save_count || 0) + 1
        })
        .eq('id', couponId)
    }

    return successResponse({ saved: true }, 'Coupon saved to favorites')
  } catch (error: any) {
    console.error('[Save Coupon API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// DELETE - Remove coupon from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const resolvedParams = await params
    const couponId = resolvedParams.id

    const supabase = getServerSupabase(request)

    // Remove from saved coupons
    const { error: deleteError } = await supabase
      .from('user_saved_coupons')
      .delete()
      .eq('user_id', userId)
      .eq('coupon_id', couponId)

    if (deleteError) {
      console.error('[Unsave Coupon API] Error:', deleteError)
      return errorResponse('Failed to remove coupon', 500)
    }

    // Decrement save count on coupon
    const { data: currentCoupon } = await supabase
      .from('coupons')
      .select('save_count')
      .eq('id', couponId)
      .single()
    
    if (currentCoupon) {
      await supabase
        .from('coupons')
        .update({
          save_count: Math.max((currentCoupon.save_count || 0) - 1, 0)
        })
        .eq('id', couponId)
    }

    return successResponse({ saved: false }, 'Coupon removed from favorites')
  } catch (error: any) {
    console.error('[Unsave Coupon API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

