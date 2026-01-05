import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

// POST - Validate a redemption (business owner confirms user redeemed)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const resolvedParams = await params
    const redemptionId = resolvedParams.id

    const body = await parseRequestBody<{
      validationMethod?: string
      notes?: string
    }>(request)

    const supabase = getServerSupabase(request)

    // Get redemption details
    const { data: redemption, error: redemptionError } = await supabase
      .from('coupon_redemptions')
      .select(`
        *,
        coupon:coupons!inner(
          *,
          subscription:subscriptions!inner(user_id)
        )
      `)
      .eq('id', redemptionId)
      .single()

    if (redemptionError || !redemption) {
      return errorResponse('Redemption not found', 404)
    }

    // Check if the requesting user is the coupon owner
    if (redemption.coupon.subscription.user_id !== userId) {
      return errorResponse('You are not authorized to validate this redemption', 403)
    }

    // Check if already validated
    if (redemption.status === 'completed') {
      return errorResponse('This redemption has already been validated', 400)
    }

    // Check if expired (e.g., redemption codes expire after 24 hours)
    const redemptionDate = new Date(redemption.redeemed_at)
    const now = new Date()
    const hoursSinceRedemption = (now.getTime() - redemptionDate.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceRedemption > 24) {
      // Mark as expired
      await supabase
        .from('coupon_redemptions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', redemptionId)

      return errorResponse('This redemption code has expired (24 hour limit)', 400)
    }

    // Validate the redemption
    const { data: validatedRedemption, error: updateError } = await supabase
      .from('coupon_redemptions')
      .update({
        status: 'completed',
        validated_by: userId,
        validated_at: new Date().toISOString(),
        validation_method: body?.validationMethod || 'manual',
        notes: body?.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', redemptionId)
      .select()
      .single()

    if (updateError) {
      console.error('[Validate Redemption API] Error:', updateError)
      return errorResponse('Failed to validate redemption', 500)
    }

    return successResponse({
      redemption: validatedRedemption
    }, 'Redemption validated successfully!')
  } catch (error: any) {
    console.error('[Validate Redemption API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// GET - Get redemption details by code (for validation lookup)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const resolvedParams = await params
    const codeOrId = resolvedParams.id

    const supabase = getServerSupabase(request)

    // Try to find by ID or by redemption code
    let query = supabase
      .from('coupon_redemptions')
      .select(`
        *,
        user:users(id, name, email),
        coupon:coupons!inner(
          *,
          subscription:subscriptions!inner(user_id)
        )
      `)

    // Check if it's a UUID (id) or a code
    if (codeOrId.includes('-')) {
      query = query.eq('id', codeOrId)
    } else {
      query = query.eq('redemption_code', codeOrId)
    }

    const { data: redemption, error } = await query.single()

    if (error || !redemption) {
      return errorResponse('Redemption not found', 404)
    }

    // Check if the requesting user is the coupon owner
    if (redemption.coupon.subscription.user_id !== userId) {
      return errorResponse('You are not authorized to view this redemption', 403)
    }

    return successResponse({ redemption })
  } catch (error: any) {
    console.error('[Get Redemption API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

