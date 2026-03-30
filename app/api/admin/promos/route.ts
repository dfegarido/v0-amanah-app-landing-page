import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

type PromoType = 'free' | 'fixed' | 'percentage'
type AppliesTo = 'mosque' | 'business'

interface CreatePromoCodeRequest {
  code: string
  enabled: boolean
  promoType: PromoType
  appliesTo: AppliesTo

  // Either set fixedAmount (dollars) or percentageValue
  fixedAmount?: string | number
  percentageValue?: string | number

  useStartDate: boolean
  startDate?: string
  useEndDate: boolean
  endDate?: string

  // null means unlimited
  maxUsers?: string | number | null

  /** Last day customers may apply the code (inclusive); separate from benefit_months */
  useRedeemByDate: boolean
  redeemByDate?: string

  /** Months of promo pricing after redemption; omit/null = legacy date-window-only behavior */
  benefitMonths?: string | number | null
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const supabase = getServerSupabase(request)

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Admin Promo Codes] GET error:', error)
      return errorResponse('Failed to fetch promo codes', 500)
    }

    const promoCodes = data || []
    const promoIds = promoCodes.map((p: any) => p.id)

    let usageByPromoId: Record<string, number> = {}
    if (promoIds.length > 0) {
      // Counts must use service role: RLS on promo_code_redemptions only allows users to see their own rows,
      // so the admin JWT client would return an empty set and show 0 usage for all promos.
      const supabaseAdmin = getSupabaseAdmin()
      const { data: redemptions, error: redemptionsError } = await supabaseAdmin
        .from('promo_code_redemptions')
        .select('promo_code_id, status')
        .in('promo_code_id', promoIds)
        .eq('status', 'active')

      if (redemptionsError) {
        console.error('[Admin Promo Codes] GET redemptions error:', redemptionsError)
      } else {
        usageByPromoId = (redemptions || []).reduce((acc: Record<string, number>, row: any) => {
          const key = row.promo_code_id
          if (!key) return acc
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})
      }
    }

    const promoCodesWithUsage = promoCodes.map((promo: any) => ({
      ...promo,
      used_users_count: usageByPromoId[promo.id] || 0,
    }))

    return successResponse({ promoCodes: promoCodesWithUsage })
  } catch (error: any) {
    console.error('[Admin Promo Codes] GET exception:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const body = await parseRequestBody<CreatePromoCodeRequest>(request)
    if (!body) return errorResponse('Invalid request body', 400)

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

    const supabase = getServerSupabase(request)
    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
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
      .select()
      .single()

    if (error) {
      console.error('[Admin Promo Codes] POST insert error:', error)
      return errorResponse(error.message || 'Failed to create promo code', 500)
    }

    return successResponse({ promoCode: data }, 'Promo code created')
  } catch (error: any) {
    console.error('[Admin Promo Codes] POST exception:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

