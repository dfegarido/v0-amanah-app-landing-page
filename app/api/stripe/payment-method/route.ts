import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const user = authResult.user

    if (!user.stripe_customer_id) {
      return successResponse({ paymentMethod: null }, 'No payment method found')
    }

    // Get customer's payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripe_customer_id,
      type: 'card',
      limit: 1,
    })

    if (paymentMethods.data.length === 0) {
      return successResponse({ paymentMethod: null }, 'No payment method found')
    }

    const pm = paymentMethods.data[0]

    return successResponse(
      {
        paymentMethod: {
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
        },
      },
      'Payment method retrieved successfully'
    )
  } catch (error: any) {
    console.error('Get payment method error:', error)
    return errorResponse(error.message || 'Failed to get payment method', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const user = authResult.user

    if (!user.stripe_customer_id) {
      return errorResponse('No Stripe customer found', 404)
    }

    // Get customer's payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripe_customer_id,
      type: 'card',
      limit: 1,
    })

    if (paymentMethods.data.length === 0) {
      return errorResponse('No payment method found', 404)
    }

    // Detach the payment method
    await stripe.paymentMethods.detach(paymentMethods.data[0].id)

    return successResponse(
      { message: 'Payment method removed successfully' },
      'Payment method removed'
    )
  } catch (error: any) {
    console.error('Delete payment method error:', error)
    return errorResponse(error.message || 'Failed to remove payment method', 500)
  }
}

