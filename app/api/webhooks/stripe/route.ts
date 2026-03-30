import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'
import { getStripe, getStripeNonprofit } from '@/lib/stripe'
import type Stripe from 'stripe'

/**
 * Stripe Webhook Handler
 * Automatically processes mosque kickbacks when subscription payments succeed (platform account).
 * Nonprofit Stripe account: same URL; verified with STRIPE_WEBHOOK_SECRET_NONPROFIT — no Connect kickbacks.
 */
export async function POST(request: NextRequest) {
  console.log('[Stripe Webhook] Received webhook')
  
  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) {
    console.error('[Stripe Webhook] No signature found')
    return new Response('No signature', { status: 400 })
  }

  let event: any
  let stripeForApi: Stripe = getStripe()
  let webhookSource: 'platform' | 'nonprofit' = 'platform'

  try {
    event = stripeForApi.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
    console.log('[Stripe Webhook] Event verified (platform):', event.type)
  } catch (primaryErr: any) {
    const nonprofitSecret = process.env.STRIPE_WEBHOOK_SECRET_NONPROFIT
    if (!nonprofitSecret || !process.env.STRIPE_SECRET_KEY_NONPROFIT) {
      console.error('[Stripe Webhook] Signature verification failed:', primaryErr.message)
      return new Response(`Webhook Error: ${primaryErr.message}`, { status: 400 })
    }
    try {
      stripeForApi = getStripeNonprofit()
      event = stripeForApi.webhooks.constructEvent(body, sig, nonprofitSecret)
      webhookSource = 'nonprofit'
      console.log('[Stripe Webhook] Event verified (nonprofit):', event.type)
    } catch (secondaryErr: any) {
      console.error(
        '[Stripe Webhook] Signature verification failed (platform + nonprofit):',
        primaryErr.message,
        secondaryErr.message,
      )
      return new Response(`Webhook Error: ${secondaryErr.message}`, { status: 400 })
    }
  }

  // Handle the event
  if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.paid') {
    await handleInvoicePaymentSucceeded(stripeForApi, event.data.object, webhookSource)
  } else if (event.type === 'account.updated') {
    await handleAccountUpdated(event.data.object)
  } else {
    console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}

/**
 * Handle successful subscription payment
 * Automatically transfer 10% kickback to affiliated mosque
 */
async function handleInvoicePaymentSucceeded(
  stripe: Stripe,
  invoice: any,
  webhookSource: 'platform' | 'nonprofit',
) {
  console.log('[Stripe Webhook] Processing invoice payment:', invoice.id)
  console.log('[Stripe Webhook] Invoice subscription field:', invoice.subscription)
  console.log('[Stripe Webhook] Invoice lines:', invoice.lines?.data?.[0]?.subscription)

  const supabaseAdmin = getSupabaseAdmin()

  try {
    // Get subscription ID from invoice
    let stripeSubscriptionId = invoice.subscription || invoice.lines?.data?.[0]?.subscription

    // If not found in webhook event, fetch full invoice from Stripe
    if (!stripeSubscriptionId) {
      console.log('[Stripe Webhook] Fetching full invoice from Stripe...')
      try {
        const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
          expand: ['subscription', 'lines.data.subscription']
        })
        stripeSubscriptionId = fullInvoice.subscription?.id || fullInvoice.subscription
        console.log('[Stripe Webhook] Full invoice subscription:', stripeSubscriptionId)
      } catch (error: any) {
        console.error('[Stripe Webhook] Failed to fetch full invoice:', error.message)
      }
    }

    if (!stripeSubscriptionId) {
      console.log('[Stripe Webhook] No subscription ID found in invoice (tried webhook + API)')
      return
    }

    console.log('[Stripe Webhook] Looking for subscription:', stripeSubscriptionId)

    // Get the subscription from our database
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, type, price_amount, stripe_subscription_id')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single()

    if (subError || !subscription) {
      console.log('[Stripe Webhook] Subscription not found in database:', stripeSubscriptionId, subError)
      return
    }

    console.log('[Stripe Webhook] Found subscription:', subscription.type, subscription.id)

    if (webhookSource === 'nonprofit') {
      console.log(
        '[Stripe Webhook] Nonprofit Stripe payout: funds stay in the nonprofit account. Skipping platform Connect transfers (mosque connected accounts belong to the main Stripe account).',
      )
      return
    }

    // Get the affiliated mosque code based on subscription type
    let mosqueCode: number | null = null
    let entityName = ''

    if (subscription.type === 'business') {
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('name, affiliated_mosque_code, donate_to_same_organization, donation_amount, donation_mosque_code')
        .eq('subscription_id', subscription.id)
        .single()

      mosqueCode = business?.affiliated_mosque_code
      entityName = business?.name || 'Unknown Business'
      
      // Check for additional donation to same mosque
      if (business?.donate_to_same_organization && business?.donation_amount && business.donation_amount > 0) {
        // Use donation_mosque_code if available, otherwise use affiliated_mosque_code
        const donationMosqueCode = business.donation_mosque_code || business.affiliated_mosque_code
        
        if (donationMosqueCode) {
          await processAdditionalDonation(
            stripe,
            supabaseAdmin,
            subscription,
            entityName,
            donationMosqueCode,
            business.donation_amount,
            invoice
          )
        }
      }
    } else if (subscription.type === 'coupon') {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('title, affiliated_mosque_code')
        .eq('subscription_id', subscription.id)
        .single()

      mosqueCode = coupon?.affiliated_mosque_code
      entityName = coupon?.title || 'Unknown Coupon'
    } else if (subscription.type === 'nonprofit') {
      const { data: nonprofit } = await supabaseAdmin
        .from('nonprofits')
        .select('name, affiliated_mosque_code')
        .eq('subscription_id', subscription.id)
        .single()

      mosqueCode = nonprofit?.affiliated_mosque_code
      entityName = nonprofit?.name || 'Unknown Nonprofit'
    }

    if (!mosqueCode) {
      console.log('[Stripe Webhook] No mosque affiliation found for subscription:', subscription.id)
      return
    }

    console.log('[Stripe Webhook] Affiliated with mosque code:', mosqueCode)

    // Get mosque's Stripe connected account
    const { data: mosque, error: mosqueError } = await supabaseAdmin
      .from('mosques')
      .select('id, name, mosque_code, stripe_account_id, stripe_payouts_enabled')
      .eq('mosque_code', mosqueCode)
      .single()

    if (mosqueError || !mosque) {
      console.error('[Stripe Webhook] Mosque not found:', mosqueCode)
      return
    }

    if (!mosque.stripe_account_id || !mosque.stripe_payouts_enabled) {
      console.log('[Stripe Webhook] Mosque does not have payouts enabled:', mosque.name)
      return
    }

    console.log('[Stripe Webhook] Processing kickback for mosque:', mosque.name)

    // Calculate 10% kickback
    const kickbackAmount = subscription.price_amount * 0.10
    console.log('[Stripe Webhook] Kickback amount: $', kickbackAmount.toFixed(2))

    if (kickbackAmount <= 0) {
      console.log('[Stripe Webhook] Kickback amount is zero, skipping')
      return
    }

    // Create Stripe transfer to mosque's connected account
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(kickbackAmount * 100), // Convert to cents
        currency: 'usd',
        destination: mosque.stripe_account_id,
        description: `10% kickback from ${entityName} (${subscription.type})`,
        metadata: {
          mosque_id: mosque.id,
          mosque_code: mosque.mosque_code.toString(),
          subscription_id: subscription.id,
          entity_name: entityName,
          entity_type: subscription.type,
          invoice_id: invoice.id
        }
      })

      console.log('[Stripe Webhook] Transfer created:', transfer.id, 'for $', kickbackAmount.toFixed(2))

      // Record payout in database
      const periodStart = new Date(invoice.period_start * 1000)
      const periodEnd = new Date(invoice.period_end * 1000)

      await supabaseAdmin
        .from('mosque_payouts')
        .insert({
          mosque_id: mosque.id,
          mosque_code: mosque.mosque_code,
          subscription_id: subscription.id,
          stripe_account_id: mosque.stripe_account_id,
          stripe_transfer_id: transfer.id,
          amount: kickbackAmount,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          status: 'paid',
          payout_date: new Date().toISOString().split('T')[0],
          affiliate_breakdown: {
            [subscription.type + 's']: [{
              id: subscription.id,
              name: entityName,
              amount: kickbackAmount
            }]
          },
          processed_at: new Date().toISOString()
        })

      console.log('[Stripe Webhook] Payout recorded in database')

    } catch (transferError: any) {
      console.error('[Stripe Webhook] Transfer failed:', transferError.message)
      
      // Record failed payout
      const periodStart = new Date(invoice.period_start * 1000)
      const periodEnd = new Date(invoice.period_end * 1000)

      await supabaseAdmin
        .from('mosque_payouts')
        .insert({
          mosque_id: mosque.id,
          mosque_code: mosque.mosque_code,
          subscription_id: subscription.id,
          stripe_account_id: mosque.stripe_account_id,
          amount: kickbackAmount,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          status: 'failed',
          error_message: transferError.message,
          affiliate_breakdown: {
            [subscription.type + 's']: [{
              id: subscription.id,
              name: entityName,
              amount: kickbackAmount
            }]
          }
        })
    }

  } catch (error: any) {
    console.error('[Stripe Webhook] Error processing invoice:', error.message)
  }
}

/**
 * Process additional donation to mosque
 * Transfers donation amount to mosque's Stripe connected account
 */
async function processAdditionalDonation(
  stripe: Stripe,
  supabaseAdmin: any,
  subscription: any,
  entityName: string,
  mosqueCode: number,
  donationAmount: number,
  invoice: any
) {
  console.log('[Stripe Webhook] Processing additional donation:', donationAmount, 'to mosque code:', mosqueCode)

  try {
    // Get mosque's Stripe connected account
    const { data: mosque, error: mosqueError } = await supabaseAdmin
      .from('mosques')
      .select('id, name, mosque_code, stripe_account_id, stripe_payouts_enabled')
      .eq('mosque_code', mosqueCode)
      .single()

    if (mosqueError || !mosque) {
      console.error('[Stripe Webhook] Mosque not found for donation:', mosqueCode)
      return
    }

    if (!mosque.stripe_account_id || !mosque.stripe_payouts_enabled) {
      console.log('[Stripe Webhook] Mosque does not have payouts enabled for donation:', mosque.name)
      return
    }

    if (donationAmount <= 0) {
      console.log('[Stripe Webhook] Donation amount is zero or negative, skipping')
      return
    }

    // Create Stripe transfer for donation
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(donationAmount * 100), // Convert to cents
        currency: 'usd',
        destination: mosque.stripe_account_id,
        description: `Additional donation from ${entityName} (${subscription.type})`,
        metadata: {
          mosque_id: mosque.id,
          mosque_code: mosque.mosque_code.toString(),
          subscription_id: subscription.id,
          entity_name: entityName,
          entity_type: subscription.type,
          invoice_id: invoice.id,
          transfer_type: 'donation'
        }
      })

      console.log('[Stripe Webhook] Donation transfer created:', transfer.id, 'for $', donationAmount.toFixed(2))

      // Record donation payout in database
      const periodStart = new Date(invoice.period_start * 1000)
      const periodEnd = new Date(invoice.period_end * 1000)

      await supabaseAdmin
        .from('mosque_payouts')
        .insert({
          mosque_id: mosque.id,
          mosque_code: mosque.mosque_code,
          subscription_id: subscription.id,
          stripe_account_id: mosque.stripe_account_id,
          stripe_transfer_id: transfer.id,
          amount: donationAmount,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          status: 'paid',
          payout_date: new Date().toISOString().split('T')[0],
          affiliate_breakdown: {
            donations: [{
              id: subscription.id,
              name: entityName,
              amount: donationAmount,
              type: 'additional_donation'
            }]
          },
          processed_at: new Date().toISOString()
        })

      console.log('[Stripe Webhook] Donation payout recorded in database')

    } catch (transferError: any) {
      console.error('[Stripe Webhook] Donation transfer failed:', transferError.message)
      
      // Record failed donation payout
      const periodStart = new Date(invoice.period_start * 1000)
      const periodEnd = new Date(invoice.period_end * 1000)

      await supabaseAdmin
        .from('mosque_payouts')
        .insert({
          mosque_id: mosque.id,
          mosque_code: mosque.mosque_code,
          subscription_id: subscription.id,
          stripe_account_id: mosque.stripe_account_id,
          amount: donationAmount,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          status: 'failed',
          error_message: transferError.message,
          affiliate_breakdown: {
            donations: [{
              id: subscription.id,
              name: entityName,
              amount: donationAmount,
              type: 'additional_donation'
            }]
          }
        })
    }

  } catch (error: any) {
    console.error('[Stripe Webhook] Error processing donation:', error.message)
  }
}

/**
 * Handle Stripe Connected Account updates
 * Update mosque account status in database
 */
async function handleAccountUpdated(account: any) {
  console.log('[Stripe Webhook] Account updated:', account.id)

  const supabaseAdmin = getSupabaseAdmin()

  try {
    // Find mosque with this Stripe account
    const { data: mosque } = await supabaseAdmin
      .from('mosques')
      .select('id, name')
      .eq('stripe_account_id', account.id)
      .single()

    if (!mosque) {
      console.log('[Stripe Webhook] No mosque found with account:', account.id)
      return
    }

    console.log('[Stripe Webhook] Updating mosque:', mosque.name)

    // Update mosque status
    await supabaseAdmin
      .from('mosques')
      .update({
        stripe_onboarding_complete: account.details_submitted,
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_details_submitted: account.details_submitted,
        updated_at: new Date().toISOString()
      })
      .eq('id', mosque.id)

    console.log('[Stripe Webhook] Mosque status updated')

  } catch (error: any) {
    console.error('[Stripe Webhook] Error updating account:', error.message)
  }
}
