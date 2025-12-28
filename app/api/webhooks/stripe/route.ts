import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { onDonationConfirmed, onDonationFailed } from '@/lib/notifications/hooks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role for webhook processing
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Stripe webhook secret from environment
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Disable body parsing - we need raw body for Stripe signature verification
export const runtime = 'nodejs'

/**
 * GET /api/webhooks/stripe
 * Test endpoint to verify webhook is accessible
 */
export async function GET(request: NextRequest) {
  return Response.json({ 
    message: 'Stripe webhook endpoint is active',
    webhookSecretConfigured: !!webhookSecret,
    timestamp: new Date().toISOString()
  })
}

/**
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events for donation payments
 * Supports: payment_intent.succeeded, payment_intent.payment_failed, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return Response.json({ error: 'Missing signature' }, { status: 400 })
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    let event: Stripe.Event

    try {
      // Get Stripe instance and verify webhook signature
      const stripe = getStripe()
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return Response.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    console.log('✅ Stripe webhook received:', event.type)

    try {
      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
          break

        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
          break

        case 'payment_intent.canceled':
          await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent)
          break

        case 'charge.refunded':
          await handleChargeRefunded(event.data.object as Stripe.Charge)
          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      return Response.json({ received: true })
    } catch (error: any) {
      console.error('Error processing webhook:', error)
      return Response.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Error in webhook handler:', error)
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const paymentIntentId = paymentIntent.id

  // Check if we've already processed this webhook (idempotency)
  const { data: existingDonation } = await supabaseAdmin
    .from('donations')
    .select('id, status, webhook_event_id')
    .eq('provider_payment_id', paymentIntentId)
    .single()

  // If already processed and succeeded, skip
  if (existingDonation?.status === 'succeeded' && existingDonation?.webhook_event_id) {
    console.log(`⚠️ Donation ${existingDonation.id} already processed`)
    return
  }

  // Find donation by payment intent ID
  const { data: donation, error: donationError } = await supabaseAdmin
    .from('donations')
    .select('*')
    .eq('provider_payment_id', paymentIntentId)
    .single()

  if (donationError || !donation) {
    console.error('Donation not found for payment intent:', paymentIntentId)
    return
  }

  // Update donation status
  const { data: updatedDonation, error: updateError } = await supabaseAdmin
    .from('donations')
    .update({
      status: 'succeeded',
      paid_at: new Date(paymentIntent.created * 1000).toISOString(),
      webhook_processed_at: new Date().toISOString(),
      webhook_event_id: paymentIntent.id, // Using payment intent ID as event ID
      metadata: {
        ...donation.metadata,
        stripe_charge_id: paymentIntent.latest_charge,
        payment_method: paymentIntent.payment_method,
      },
    })
    .eq('id', donation.id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating donation:', updateError)
    return
  }

  console.log('✅ Donation confirmed:', updatedDonation.id)

  // Trigger notification hook
  try {
    await onDonationConfirmed({
      donationId: updatedDonation.id,
      userId: updatedDonation.user_id || undefined,
      donorName: updatedDonation.donor_name || undefined,
      donorEmail: updatedDonation.donor_email || undefined,
      amount: Number(updatedDonation.amount),
      currency: updatedDonation.currency,
      mosqueId: updatedDonation.mosque_id || undefined,
      mosqueCode: updatedDonation.mosque_code || undefined,
    })
  } catch (hookError) {
    console.error('Error triggering donation notification hook:', hookError)
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const paymentIntentId = paymentIntent.id

  // Find donation
  const { data: donation, error: donationError } = await supabaseAdmin
    .from('donations')
    .select('*')
    .eq('provider_payment_id', paymentIntentId)
    .single()

  if (donationError || !donation) {
    console.error('Donation not found for payment intent:', paymentIntentId)
    return
  }

  // Update donation status
  const { error: updateError } = await supabaseAdmin
    .from('donations')
    .update({
      status: 'failed',
      failed_at: new Date(paymentIntent.created * 1000).toISOString(),
      webhook_processed_at: new Date().toISOString(),
      webhook_event_id: paymentIntent.id,
      metadata: {
        ...donation.metadata,
        failure_reason: paymentIntent.last_payment_error?.message,
      },
    })
    .eq('id', donation.id)

  if (updateError) {
    console.error('Error updating donation:', updateError)
    return
  }

  console.log('❌ Donation failed:', donation.id)

  // Trigger notification hook
  try {
    await onDonationFailed({
      donationId: donation.id,
      userId: donation.user_id || undefined,
      donorEmail: donation.donor_email || undefined,
      amount: Number(donation.amount),
      currency: donation.currency,
      reason: paymentIntent.last_payment_error?.message,
    })
  } catch (hookError) {
    console.error('Error triggering donation failed notification hook:', hookError)
  }
}

/**
 * Handle canceled payment intent
 */
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const paymentIntentId = paymentIntent.id

  const { error: updateError } = await supabaseAdmin
    .from('donations')
    .update({
      status: 'canceled',
      webhook_processed_at: new Date().toISOString(),
      webhook_event_id: paymentIntent.id,
    })
    .eq('provider_payment_id', paymentIntentId)

  if (updateError) {
    console.error('Error updating canceled donation:', updateError)
  } else {
    console.log('⚠️ Donation canceled:', paymentIntentId)
  }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string

  if (!paymentIntentId) {
    return
  }

  // Find donation
  const { data: donation, error: donationError } = await supabaseAdmin
    .from('donations')
    .select('*')
    .eq('provider_payment_id', paymentIntentId)
    .single()

  if (donationError || !donation) {
    return
  }

  // Determine if partial or full refund
  const refundAmount = charge.amount_refunded
  const originalAmount = charge.amount
  const isPartial = refundAmount < originalAmount

  const { error: updateError } = await supabaseAdmin
    .from('donations')
    .update({
      status: isPartial ? 'partially_refunded' : 'refunded',
      refunded_at: new Date().toISOString(),
      webhook_processed_at: new Date().toISOString(),
      metadata: {
        ...donation.metadata,
        refund_amount: refundAmount / 100, // Convert cents to dollars
        refund_reason: charge.refunds?.data[0]?.reason,
      },
    })
    .eq('id', donation.id)

  if (updateError) {
    console.error('Error updating refunded donation:', updateError)
  } else {
    console.log(`💰 Donation ${isPartial ? 'partially ' : ''}refunded:`, donation.id)
  }
}
