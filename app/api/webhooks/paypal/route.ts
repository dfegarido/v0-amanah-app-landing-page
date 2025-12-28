import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { onDonationConfirmed, onDonationFailed } from '@/lib/notifications/hooks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * POST /api/webhooks/paypal
 * 
 * Handles PayPal webhook events for donation payments
 * 
 * Note: PayPal webhook verification requires PayPal SDK setup
 * This is a placeholder structure for future implementation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headersList = headers()
    const signature = headersList.get('paypal-transmission-id')
    const certUrl = headersList.get('paypal-cert-url')
    const authAlgo = headersList.get('paypal-auth-algo')
    const transmissionSig = headersList.get('paypal-transmission-sig')
    const transmissionTime = headersList.get('paypal-transmission-time')

    // TODO: Implement PayPal webhook signature verification
    // This requires PayPal SDK setup
    /*
    const verified = await verifyPayPalWebhook({
      webhookId: process.env.PAYPAL_WEBHOOK_ID!,
      transmissionId: signature,
      certUrl: certUrl,
      authAlgo: authAlgo,
      transmissionSig: transmissionSig,
      transmissionTime: transmissionTime,
      webhookEvent: body
    })

    if (!verified) {
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }
    */

    console.log('✅ PayPal webhook received:', body.event_type)

    // Handle different event types
    switch (body.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(body.resource)
        break

      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaymentCaptureDenied(body.resource)
        break

      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentCaptureRefunded(body.resource)
        break

      default:
        console.log(`Unhandled PayPal event type: ${body.event_type}`)
    }

    return Response.json({ received: true })
  } catch (error: any) {
    console.error('Error processing PayPal webhook:', error)
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

/**
 * Handle successful payment capture
 */
async function handlePaymentCaptureCompleted(capture: any) {
  const orderId = capture.supplementary_data?.related_ids?.order_id
  const captureId = capture.id

  // Find donation by PayPal order ID or capture ID
  const { data: donation, error: donationError } = await supabaseAdmin
    .from('donations')
    .select('*')
    .eq('provider_payment_id', orderId || captureId)
    .single()

  if (donationError || !donation) {
    console.error('Donation not found for PayPal capture:', orderId || captureId)
    return
  }

  // Check idempotency
  if (donation.status === 'succeeded' && donation.webhook_event_id) {
    console.log(`⚠️ Donation ${donation.id} already processed`)
    return
  }

  // Update donation
  const amount = parseFloat(capture.amount.value)
  const currency = capture.amount.currency_code

  const { data: updatedDonation, error: updateError } = await supabaseAdmin
    .from('donations')
    .update({
      status: 'succeeded',
      amount: amount,
      currency: currency,
      paid_at: new Date(capture.create_time).toISOString(),
      webhook_processed_at: new Date().toISOString(),
      webhook_event_id: captureId,
      metadata: {
        ...donation.metadata,
        paypal_capture_id: captureId,
        paypal_order_id: orderId,
      },
    })
    .eq('id', donation.id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating donation:', updateError)
    return
  }

  console.log('✅ PayPal donation confirmed:', updatedDonation.id)

  // Trigger notification
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
 * Handle denied payment capture
 */
async function handlePaymentCaptureDenied(capture: any) {
  const orderId = capture.supplementary_data?.related_ids?.order_id
  const captureId = capture.id

  const { data: donation, error: donationError } = await supabaseAdmin
    .from('donations')
    .select('*')
    .eq('provider_payment_id', orderId || captureId)
    .single()

  if (donationError || !donation) {
    return
  }

  await supabaseAdmin
    .from('donations')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      webhook_processed_at: new Date().toISOString(),
      metadata: {
        ...donation.metadata,
        failure_reason: capture.reason_code || 'Payment denied',
      },
    })
    .eq('id', donation.id)

  // Trigger notification
  try {
    await onDonationFailed({
      donationId: donation.id,
      userId: donation.user_id || undefined,
      donorEmail: donation.donor_email || undefined,
      amount: Number(donation.amount),
      currency: donation.currency,
      reason: capture.reason_code || 'Payment denied',
    })
  } catch (hookError) {
    console.error('Error triggering donation failed notification:', hookError)
  }
}

/**
 * Handle refunded payment capture
 */
async function handlePaymentCaptureRefunded(refund: any) {
  const captureId = refund.capture_id

  const { data: donation, error: donationError } = await supabaseAdmin
    .from('donations')
    .select('*')
    .eq('metadata->>paypal_capture_id', captureId)
    .single()

  if (donationError || !donation) {
    return
  }

  const refundAmount = parseFloat(refund.amount.value)
  const originalAmount = Number(donation.amount)
  const isPartial = refundAmount < originalAmount

  await supabaseAdmin
    .from('donations')
    .update({
      status: isPartial ? 'partially_refunded' : 'refunded',
      refunded_at: new Date().toISOString(),
      webhook_processed_at: new Date().toISOString(),
      metadata: {
        ...donation.metadata,
        refund_amount: refundAmount,
        refund_reason: refund.reason,
      },
    })
    .eq('id', donation.id)

  console.log(`💰 PayPal donation ${isPartial ? 'partially ' : ''}refunded:`, donation.id)
}

