import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

type PromoType = 'free' | 'fixed' | 'percentage'
type AppliesTo = 'mosque' | 'business'

interface UpdatePromoCodeRequest {
  code: string
  enabled: boolean
  promoType: PromoType
  appliesTo: AppliesTo

  fixedAmount?: string | number
  percentageValue?: string | number

  useStartDate: boolean
  startDate?: string
  useEndDate: boolean
  endDate?: string

  maxUsers?: string | number | null

  useRedeemByDate: boolean
  redeemByDate?: string

  benefitMonths?: string | number | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const body = await parseRequestBody<UpdatePromoCodeRequest>(request)
    if (!body) return errorResponse('Invalid request body', 400)

    const resolvedParams = await params
    const promoId = resolvedParams.id
    if (!promoId) return errorResponse('Missing promo id', 400)

    const code = body.code?.trim().toUpperCase()
    if (!code) return errorResponse('Promo code is required', 400)

    const promoType = body.promoType
    const appliesTo = body.appliesTo

    if (!['free', 'fixed', 'percentage'].includes(promoType)) {
      return errorResponse('Invalid promoType', 400)
    }
    if (!['mosque', 'business'].includes(appliesTo)) {
      return errorResponse('Invalid appliesTo', 400)
    }

    const enabled = Boolean(body.enabled)

    let fixedAmountCents: number | null = null
    let percentageValueInt: number | null = null

    if (promoType === 'fixed') {
      const fixed = typeof body.fixedAmount === 'string' ? parseFloat(body.fixedAmount) : Number(body.fixedAmount)
      if (!Number.isFinite(fixed) || fixed < 0) {
        return errorResponse('fixedAmount must be a non-negative number', 400)
      }
      fixedAmountCents = Math.round(fixed * 100)
    }

    if (promoType === 'percentage') {
      const pct = typeof body.percentageValue === 'string' ? parseInt(body.percentageValue, 10) : Number(body.percentageValue)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return errorResponse('percentageValue must be between 0 and 100', 400)
      }
      percentageValueInt = Math.round(pct)
    }

    const useStartDate = Boolean(body.useStartDate)
    const useEndDate = Boolean(body.useEndDate)

    const startDate = useStartDate ? body.startDate?.trim() : null
    const endDate = useEndDate ? body.endDate?.trim() : null

    if (useStartDate && (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate))) {
      return errorResponse('startDate must be YYYY-MM-DD when useStartDate is enabled', 400)
    }
    if (useEndDate && (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))) {
      return errorResponse('endDate must be YYYY-MM-DD when useEndDate is enabled', 400)
    }

    let maxUsers: number | null = null
    if (body.maxUsers !== undefined && body.maxUsers !== null && String(body.maxUsers).trim() !== '') {
      const parsed = typeof body.maxUsers === 'string' ? parseInt(body.maxUsers, 10) : Number(body.maxUsers)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return errorResponse('maxUsers must be a positive integer (or leave empty for unlimited)', 400)
      }
      maxUsers = Math.floor(parsed)
    }

    const useRedeemByDate = Boolean(body.useRedeemByDate)
    let redeemByDateVal: string | null = null
    if (useRedeemByDate) {
      const raw = body.redeemByDate?.trim()
      if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return errorResponse('redeemByDate must be YYYY-MM-DD when useRedeemByDate is enabled', 400)
      }
      redeemByDateVal = raw
    }

    let benefitMonthsVal: number | null = null
    if (
      body.benefitMonths !== undefined &&
      body.benefitMonths !== null &&
      String(body.benefitMonths).trim() !== ''
    ) {
      const parsed =
        typeof body.benefitMonths === 'string'
          ? parseInt(body.benefitMonths, 10)
          : Number(body.benefitMonths)
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 120) {
        return errorResponse('benefitMonths must be between 1 and 120 (or leave empty for legacy rules)', 400)
      }
      benefitMonthsVal = Math.floor(parsed)
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .update({
        code,
        enabled,
        promo_type: promoType,
        fixed_amount_cents: fixedAmountCents,
        percentage_value: percentageValueInt,
        applies_to: appliesTo,
        use_start_date: useStartDate,
        start_date: startDate,
        use_end_date: useEndDate,
        end_date: endDate,
        max_users: maxUsers,
        use_redeem_by_date: useRedeemByDate,
        redeem_by_date: redeemByDateVal,
        benefit_months: benefitMonthsVal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', promoId)
      .select()
      .single()

    if (error) {
      console.error('[Admin Promo Codes] PATCH update error:', error)
      return errorResponse(error.message || 'Failed to update promo code', 500)
    }

    return successResponse({ promoCode: data }, 'Promo code updated')
  } catch (error: any) {
    console.error('[Admin Promo Codes] PATCH exception:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const resolvedParams = await params
    const promoId = resolvedParams.id
    if (!promoId) return errorResponse('Missing promo id', 400)

    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .delete()
      .eq('id', promoId)
      .select('id')

    if (error) {
      console.error('[Admin Promo Codes] DELETE error:', error)
      return errorResponse(error.message || 'Failed to delete promo code', 500)
    }

    if (!data?.length) {
      return errorResponse('Promo code not found', 404)
    }

    return successResponse({ deleted: true }, 'Promo code deleted')
  } catch (error: any) {
    console.error('[Admin Promo Codes] DELETE exception:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

