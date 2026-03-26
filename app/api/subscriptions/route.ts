import { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/auth'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

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

// GET /api/subscriptions - Get user's subscriptions
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const supabase = getServerSupabase(request)
    const { searchParams } = new URL(request.url)
    const timezone = searchParams.get('timezone') || 'UTC'
    const localTodayISO = getLocalDateISO(timezone)

    // Get all subscriptions for the user
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError)
      return errorResponse('Failed to fetch subscriptions', 500)
    }

    const subscriptionIds = subscriptions?.map((s) => s.id) || []

    // Fetch promo redemptions for these subscriptions (if any),
    // then fetch promo code details separately to avoid relying on relationship naming.
    let redemptionBySubscriptionId: Record<string, any> = {}
    let promoById: Record<string, any> = {}

    if (subscriptionIds.length > 0) {
      const { data: redemptions, error: promoRedemptionError } = await supabase
        .from('promo_code_redemptions')
        .select('subscription_id, normal_price_cents, promo_code_id')
        .eq('user_id', userId)
        .in('subscription_id', subscriptionIds)

      if (promoRedemptionError) {
        console.error('[Subscriptions API] Promo redemption fetch error:', promoRedemptionError)
      } else {
        const promoCodeIds = Array.from(
          new Set((redemptions || []).map((r: any) => r.promo_code_id).filter(Boolean))
        )

        if (promoCodeIds.length > 0) {
          const { data: promoCodes, error: promoCodesError } = await supabase
            .from('promo_codes')
            .select('id, promo_type, fixed_amount_cents, percentage_value, use_start_date, start_date, use_end_date, end_date, enabled')
            .in('id', promoCodeIds)

          if (promoCodesError) {
            console.error('[Subscriptions API] Promo code fetch error:', promoCodesError)
          } else {
            ;(promoCodes || []).forEach((p: any) => {
              promoById[p.id] = p
            })
          }
        }

        ;(redemptions || []).forEach((r: any) => {
          if (r.subscription_id) redemptionBySubscriptionId[r.subscription_id] = r
        })
      }
    }

    // Fetch related entities for each subscription
    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        let entity = null
        let entityError = null

        switch (sub.type) {
          case 'mosque':
            const { data: mosque, error: mosqueErr } = await supabase
              .from('mosques')
              .select('*')
              .eq('subscription_id', sub.id)
              .single()
            entity = mosque
            entityError = mosqueErr
            break

          case 'business':
            const { data: business, error: businessErr } = await supabase
              .from('businesses')
              .select('*')
              .eq('subscription_id', sub.id)
              .single()
            entity = business
            entityError = businessErr
            break

          case 'coupon':
            const { data: coupon, error: couponErr } = await supabase
              .from('coupons')
              .select('*')
              .eq('subscription_id', sub.id)
              .single()
            entity = coupon
            entityError = couponErr
            break

          case 'nonprofit':
            const { data: nonprofit, error: nonprofitErr } = await supabase
              .from('nonprofits')
              .select('*')
              .eq('subscription_id', sub.id)
              .single()
            entity = nonprofit
            entityError = nonprofitErr
            break
        }

        return {
          ...sub,
          entity,
          entityError: entityError ? entityError.message : null
        }
      })
    )

    // Filter out subscriptions without entity records (orphaned subscriptions)
    const validSubscriptions = enrichedSubscriptions.filter(sub => sub.entity !== null).map((sub) => {
      const redemption = redemptionBySubscriptionId[sub.id]
      const promo = redemption?.promo_code_id ? promoById[redemption.promo_code_id] : null

      if (!promo) {
        return sub
      }

      const normalCents = redemption.normal_price_cents
      const promoActive = Boolean(promo.enabled) && isPromoActiveForLocalDate(promo, localTodayISO)

      let effectiveCents = normalCents
      if (promoActive) {
        if (promo.promo_type === 'free') {
          effectiveCents = 0
        } else if (promo.promo_type === 'fixed') {
          const fixedCents = promo.fixed_amount_cents || 0
          effectiveCents = Math.max(normalCents - fixedCents, 0)
        } else if (promo.promo_type === 'percentage') {
          const pct = promo.percentage_value || 0
          effectiveCents = Math.round((normalCents * (100 - pct)) / 100)
        }
      }

      return {
        ...sub,
        effective_price_amount: effectiveCents / 100,
      }
    })

    return successResponse(validSubscriptions)

  } catch (error: any) {
    console.error('Get subscriptions error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}
