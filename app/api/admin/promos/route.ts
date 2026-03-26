import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

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
      const { data: redemptions, error: redemptionsError } = await supabase
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

