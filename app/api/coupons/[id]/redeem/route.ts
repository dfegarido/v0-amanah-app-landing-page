import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

// POST - Redeem a coupon
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const resolvedParams = await params
    const couponId = resolvedParams.id

    const supabase = getServerSupabase(request)

    console.log(`[Redeem API] User ${userId} attempting to redeem coupon ${couponId}`)

    // Check if user can redeem this coupon (using database function)
    const { data: canRedeem, error: checkError } = await supabase
      .rpc('can_redeem_coupon', {
        p_coupon_id: couponId,
        p_user_id: userId
      })

    if (checkError) {
      console.error('[Redeem API] Error checking eligibility:', checkError)
      return errorResponse('Failed to check redemption eligibility', 500)
    }

    if (!canRedeem) {
      return errorResponse(
        'You have already redeemed this coupon for the current period or it has expired',
        400
      )
    }

    // Get coupon details
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .single()

    if (couponError || !coupon) {
      return errorResponse('Coupon not found', 404)
    }

    // Generate unique redemption code
    const { data: redemptionCode } = await supabase
      .rpc('generate_redemption_code')

    if (!redemptionCode) {
      return errorResponse('Failed to generate redemption code', 500)
    }

    // Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from('coupon_redemptions')
      .insert({
        coupon_id: couponId,
        user_id: userId,
        business_id: coupon.business_id || null,
        redemption_code: redemptionCode,
        status: 'pending', // Will be 'completed' after business validates
        redeemed_at: new Date().toISOString(),
        metadata: {
          coupon_title: coupon.title,
          discount_details: coupon.discount_details || coupon.description,
          business_name: coupon.merchant || 'Unknown'
        }
      })
      .select()
      .single()

    if (redemptionError) {
      console.error('[Redeem API] Error creating redemption:', redemptionError)
      return errorResponse('Failed to create redemption', 500)
    }

    console.log(`[Redeem API] Redemption created successfully: ${redemption.id}`)

    // Generate QR code data (just the redemption ID and code)
    const qrData = JSON.stringify({
      redemptionId: redemption.id,
      code: redemptionCode,
      couponId: couponId
    })

    return successResponse({
      redemption: {
        id: redemption.id,
        code: redemptionCode,
        qrData: qrData,
        status: redemption.status,
        coupon: {
          title: coupon.title,
          discountDetails: coupon.discount_details || coupon.description,
          discountAmount: coupon.discount_amount,
          discountPercentage: coupon.discount_percentage
        },
        business: {
          name: coupon.merchant,
          address: coupon.address,
          phone: coupon.phone
        },
        redeemedAt: redemption.redeemed_at
      }
    }, 'Coupon redeemed successfully! Show this code to the business.')
  } catch (error: any) {
    console.error('[Redeem API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

