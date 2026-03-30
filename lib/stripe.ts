import Stripe from 'stripe'

// Lazy initialization - only create Stripe client when needed
// This prevents errors when Stripe keys are not set but Stripe isn't being used
let stripeInstance: Stripe | null = null
let stripeNonprofitInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  }
  return stripeInstance
}

/** Dedicated Stripe account for nonprofit listing subscriptions only (e.g. AmanahUS). */
export function getStripeNonprofit(): Stripe {
  if (!stripeNonprofitInstance) {
    if (!process.env.STRIPE_SECRET_KEY_NONPROFIT) {
      throw new Error('STRIPE_SECRET_KEY_NONPROFIT is not set in environment variables')
    }
    stripeNonprofitInstance = new Stripe(process.env.STRIPE_SECRET_KEY_NONPROFIT, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  }
  return stripeNonprofitInstance
}

export function getStripeForSubscriptionType(
  type: 'mosque' | 'business' | 'coupon' | 'nonprofit',
): Stripe {
  return type === 'nonprofit' ? getStripeNonprofit() : getStripe()
}

// Export stripe as a Proxy for backward compatibility
// This ensures Stripe is only initialized when actually used
// Prefer using getStripe() directly in new code
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop]
  }
})
