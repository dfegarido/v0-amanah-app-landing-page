import { addMonths } from 'date-fns'

/**
 * Last calendar day (YYYY-MM-DD) the discounted/free benefit applies, inclusive.
 * Benefit length is `benefitMonths` full calendar months anchored on the redemption local date.
 */
export function computeBenefitEndsOnInclusive(
  redemptionLocalDateISO: string,
  benefitMonths: number
): string {
  const [y, m, d] = redemptionLocalDateISO.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end = addMonths(start, benefitMonths)
  end.setDate(end.getDate() - 1)
  const yy = end.getFullYear()
  const mm = String(end.getMonth() + 1).padStart(2, '0')
  const dd = String(end.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/**
 * Whether the customer may apply / redeem this promo today (local YYYY-MM-DD).
 * Signup deadline: use_redeem_by_date + redeem_by_date when set; otherwise legacy use_end_date.
 */
export function isPromoRedemptionAllowed(promo: any, localTodayISO: string): boolean {
  if (promo.use_start_date && promo.start_date && localTodayISO < promo.start_date) {
    return false
  }
  if (promo.use_redeem_by_date && promo.redeem_by_date) {
    if (localTodayISO > promo.redeem_by_date) return false
  } else if (promo.use_end_date && promo.end_date) {
    if (localTodayISO > promo.end_date) return false
  }
  return true
}

/**
 * Whether subscription pricing should still reflect the promo (dashboard / in-app).
 */
export function isSubscriptionBenefitActive(
  redemption: { benefit_ends_on?: string | null },
  promo: any,
  localTodayISO: string
): boolean {
  if (redemption.benefit_ends_on) {
    return localTodayISO <= redemption.benefit_ends_on
  }
  if (!promo.enabled) return false
  if (promo.use_start_date && promo.start_date && localTodayISO < promo.start_date) return false
  if (promo.use_end_date && promo.end_date && localTodayISO > promo.end_date) return false
  return true
}
