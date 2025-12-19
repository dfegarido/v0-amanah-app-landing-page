import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getServerSupabase } from '@/lib/auth'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const user = authResult.user
    const supabase = getServerSupabase(request)

    // Check if user has a Stripe customer ID
    let stripeCustomerId = user.stripe_customer_id

    // If not, create a Stripe customer
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          user_id: user.id,
        },
      })

      stripeCustomerId = customer.id

      // Save customer ID to database
      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error saving Stripe customer ID:', updateError)
        return errorResponse('Failed to create customer', 500)
      }
    }

    // Create a SetupIntent for future payments
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    })

    return successResponse(
      {
        clientSecret: setupIntent.client_secret,
        customerId: stripeCustomerId,
      },
      'Setup intent created successfully'
    )
  } catch (error: any) {
    console.error('Setup intent error:', error)
    return errorResponse(error.message || 'Failed to create setup intent', 500)
  }
}

