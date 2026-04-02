import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'
import { getStripeForSubscriptionType } from '@/lib/stripe'
import type Stripe from 'stripe'

/**
 * Return a fresh client_secret for an incomplete subscription so the member can finish
 * payment without calling POST /subscriptions/create again (avoids duplicate Stripe subs / double charge).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { data: row, error } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, type, stripe_subscription_id, stripe_customer_id')
      .eq('id', id)
      .single()

    if (error || !row) {
      return errorResponse('Subscription not found', 404)
    }

    if (row.user_id !== authResult.user.id) {
      return errorResponse('Unauthorized', 403)
    }

    if (!row.stripe_subscription_id || !row.stripe_customer_id) {
      return errorResponse('Subscription is not set up for online payment', 400)
    }

    const subType = row.type as 'mosque' | 'business' | 'coupon' | 'nonprofit'
    const stripe = getStripeForSubscriptionType(subType)

    let stripeSub = await stripe.subscriptions.retrieve(row.stripe_subscription_id, {
      expand: ['latest_invoice.payment_intent'],
    })

    if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
      return errorResponse('This subscription is already active', 400)
    }

    if (stripeSub.status === 'canceled' || stripeSub.status === 'incomplete_expired') {
      return errorResponse(
        'This checkout session expired. Please start a new subscription from the form.',
        410,
      )
    }

    let latestInvoice = stripeSub.latest_invoice as Stripe.Invoice | string | null
    if (typeof latestInvoice === 'string') {
      latestInvoice = await stripe.invoices.retrieve(latestInvoice, {
        expand: ['payment_intent'],
      })
    }

    const piRaw = latestInvoice?.payment_intent
    const paymentIntent =
      typeof piRaw === 'object' && piRaw !== null && 'client_secret' in piRaw ? piRaw : null

    if (paymentIntent?.client_secret) {
      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
        return errorResponse('Payment is already processing or complete.', 400)
      }
      return successResponse({
        clientSecret: paymentIntent.client_secret,
        confirmationType: 'payment_intent' as const,
      })
    }

    const amountDue = latestInvoice?.amount_due ?? 0
    if ((stripeSub.status === 'incomplete' || stripeSub.status === 'past_due') && amountDue === 0) {
      const si = await stripe.setupIntents.create({
        customer: row.stripe_customer_id,
        payment_method_types: ['card'],
        metadata: {
          user_id: row.user_id,
          stripe_subscription_id: row.stripe_subscription_id,
          resume_checkout: 'true',
        },
      })
      if (!si.client_secret) {
        return errorResponse('Could not resume card setup', 500)
      }
      return successResponse({
        clientSecret: si.client_secret,
        confirmationType: 'setup_intent' as const,
      })
    }

    return errorResponse('Unable to resume payment for this subscription. Contact support.', 400)
  } catch (e: any) {
    console.error('[resume-payment]', e)
    return errorResponse(e.message || 'Failed to resume payment', 500)
  }
}
