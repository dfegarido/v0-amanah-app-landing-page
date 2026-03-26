import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

interface PromoPreviewRequest {
  code: string
  subscriptionType: 'mosque' | 'business'
  timezone: string
  basePriceCents: number
}

function getLocalDateISO(timeZone: string, date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  if (!year || !month || !day) return date.toISOString().split('T')[0]
  return `${year}-${month}-${day}`
}

function isPromoActiveForLocalDate(promo: any, localDateISO: string): boolean {
  if (promo.use_start_date && promo.start_date && localDateISO < promo.start_date) return false
  if (promo.use_end_date && promo.end_date && localDateISO > promo.end_date) return false
  return true
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body = await parseRequestBody<PromoPreviewRequest>(request)
    if (!body) return errorResponse('Invalid request body', 400)

    const code = body.code?.trim().toUpperCase()
    if (!code) return errorResponse('Promo code is required', 400)

    if (body.subscriptionType !== 'mosque' && body.subscriptionType !== 'business') {
      return errorResponse('Promo preview only supports mosque/business subscriptions', 400)
    }

    if (!body.timezone?.trim()) {
      return errorResponse('timezone is required', 400)
    }

    if (!Number.isFinite(body.basePriceCents) || body.basePriceCents < 0) {
      return errorResponse('basePriceCents must be a non-negative number', 400)
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: promo, error } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .ilike('code', code)
      .limit(1)
      .maybeSingle()

    if (error || !promo) {
      return errorResponse('Invalid promo code', 400)
    }

    if (!promo.enabled) {
      return errorResponse('This promo code is disabled', 400)
    }

    if (promo.applies_to !== body.subscriptionType) {
      return errorResponse('This promo code does not apply to this subscription type', 400)
    }

    const localToday = getLocalDateISO(body.timezone)
    if (!isPromoActiveForLocalDate(promo, localToday)) {
      return errorResponse('This promo code is not active for today', 400)
    }

    const userId = authResult.user.id
    const { data: alreadyUsed } = await supabaseAdmin
      .from('promo_code_redemptions')
      .select('id')
      .eq('promo_code_id', promo.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (alreadyUsed) {
      return errorResponse('Promo code already used by this account', 400)
    }

    if (promo.max_users !== null && promo.max_users !== undefined) {
      const { count } = await supabaseAdmin
        .from('promo_code_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('promo_code_id', promo.id)
        .eq('status', 'active')

      if ((count || 0) >= promo.max_users) {
        return errorResponse('This promo code has reached its usage limit', 400)
      }
    }

    const baseCents = Math.round(body.basePriceCents)
    let effectiveCents = baseCents
    let discountCents = 0

    if (promo.promo_type === 'free') {
      effectiveCents = 0
      discountCents = baseCents
    } else if (promo.promo_type === 'fixed') {
      const fixed = promo.fixed_amount_cents || 0
      effectiveCents = Math.max(baseCents - fixed, 0)
      discountCents = baseCents - effectiveCents
    } else if (promo.promo_type === 'percentage') {
      const pct = promo.percentage_value || 0
      effectiveCents = Math.round((baseCents * (100 - pct)) / 100)
      discountCents = baseCents - effectiveCents
    }

    return successResponse({
      promo: {
        id: promo.id,
        code: promo.code,
        promoType: promo.promo_type,
      },
      pricing: {
        basePriceCents: baseCents,
        discountCents,
        effectivePriceCents: effectiveCents,
      },
    })
  } catch (error: any) {
    console.error('[Promo Preview] Error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

