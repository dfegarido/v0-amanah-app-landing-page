/**
 * Donation Service
 * 
 * Handles donation-related operations including payment intent creation
 * for Stripe and PayPal
 */

import Stripe from 'stripe'
import { getStripe } from '../stripe'

export interface CreateDonationIntentParams {
  amount: number // in dollars
  currency?: string
  userId?: string
  donorName?: string
  donorEmail?: string
  mosqueId?: string
  mosqueCode?: number
  campaignName?: string
  purpose?: string
  metadata?: Record<string, any>
}

export interface DonationIntentResult {
  paymentIntentId: string
  clientSecret: string
  amount: number
  currency: string
}

/**
 * Create a Stripe PaymentIntent for a donation
 */
export async function createStripeDonationIntent(
  params: CreateDonationIntentParams
): Promise<DonationIntentResult> {
  const {
    amount,
    currency = 'usd',
    userId,
    donorName,
    donorEmail,
    mosqueId,
    mosqueCode,
    campaignName,
    purpose,
    metadata = {},
  } = params

  // Convert amount to cents
  const amountInCents = Math.round(amount * 100)

  if (amountInCents < 50) {
    // Minimum $0.50
    throw new Error('Donation amount must be at least $0.50')
  }

  // Prepare metadata
  const paymentMetadata: Record<string, string> = {
    type: 'donation',
    ...metadata,
  }

  if (userId) {
    paymentMetadata.user_id = userId
  }
  if (mosqueId) {
    paymentMetadata.mosque_id = mosqueId
  }
  if (mosqueCode) {
    paymentMetadata.mosque_code = mosqueCode.toString()
  }
  if (campaignName) {
    paymentMetadata.campaign_name = campaignName
  }

  // Get Stripe instance
  const stripe = getStripe()

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: currency.toLowerCase(),
    metadata: paymentMetadata,
    description: purpose || `Donation${campaignName ? ` for ${campaignName}` : ''}`,
    receipt_email: donorEmail || undefined,
  })

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret!,
    amount,
    currency,
  }
}

/**
 * Create a PayPal order for a donation
 * Note: PayPal integration requires PayPal SDK setup
 * This is a placeholder for future implementation
 */
export async function createPayPalDonationOrder(
  params: CreateDonationIntentParams
): Promise<{ orderId: string; approvalUrl: string }> {
  // TODO: Implement PayPal integration
  // This would use PayPal SDK to create an order
  throw new Error('PayPal integration not yet implemented')
}
