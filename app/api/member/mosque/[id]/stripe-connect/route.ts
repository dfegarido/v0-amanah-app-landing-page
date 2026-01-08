import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * Create a Stripe Connected Account link for onboarding (Member)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  console.log('[Member Stripe Connect API] POST request received')
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) {
      console.error('[Member Stripe Connect API] Auth failed:', authResult.error)
      return authResult.error
    }

    console.log('[Member Stripe Connect API] User authenticated:', authResult.user.email)

    const { id } = await params
    console.log('[Member Stripe Connect API] Mosque ID:', id)
    
    const body = await request.json()
    const { refresh } = body // If true, create a new account link for existing account
    console.log('[Member Stripe Connect API] Refresh mode:', refresh)

    // Check Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Member Stripe Connect API] STRIPE_SECRET_KEY not configured')
      return errorResponse('Stripe is not configured', 500)
    }

    const supabase = getServerSupabase(request)

    // Get mosque details and verify ownership
    const { data: mosque, error: mosqueError } = await supabase
      .from('mosques')
      .select('id, name, email, stripe_account_id, user_id, subscription_id')
      .eq('id', id)
      .single()

    if (mosqueError || !mosque) {
      console.error('[Member Stripe Connect API] Mosque not found:', mosqueError)
      return errorResponse('Mosque not found', 404)
    }

    // Verify the user owns this mosque
    if (mosque.user_id !== authResult.user.id) {
      console.error('[Member Stripe Connect API] User does not own this mosque')
      return errorResponse('Unauthorized - You do not own this mosque', 403)
    }

    console.log('[Member Stripe Connect API] Mosque found:', mosque.name)
    console.log('[Member Stripe Connect API] Existing account ID:', mosque.stripe_account_id)

    let accountId = mosque.stripe_account_id

    // If no account exists, create one
    if (!accountId) {
      console.log('[Member Stripe Connect API] Creating new Stripe account...')
      try {
        const account = await stripe.accounts.create({
          type: 'express', // Use Express for simpler onboarding
          country: 'US',
          email: mosque.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'non_profit', // Mosques are typically non-profit
          metadata: {
            mosque_id: mosque.id,
            mosque_name: mosque.name,
            user_id: authResult.user.id
          }
        })

        accountId = account.id

        // Save the account ID to the database
        await supabase
          .from('mosques')
          .update({
            stripe_account_id: accountId,
            stripe_account_type: 'express',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)

        console.log('[Stripe] Created new connected account:', accountId)
      } catch (stripeError: any) {
        console.error('[Stripe] Account creation failed:', stripeError)
        return errorResponse(`Failed to create Stripe account: ${stripeError.message}`, 500)
      }
    }

    // Create an account link for onboarding
    console.log('[Member Stripe Connect API] Creating account link for:', accountId)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    console.log('[Member Stripe Connect API] Using app URL:', appUrl)
    
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${appUrl}/member/subscription/${mosque.subscription_id}?stripe_refresh=true`,
        return_url: `${appUrl}/member/subscription/${mosque.subscription_id}?stripe_success=true`,
        type: 'account_onboarding',
      })

      console.log('[Member Stripe Connect API] Account link created successfully:', accountLink.url)

      return successResponse({
        url: accountLink.url,
        account_id: accountId
      })
    } catch (stripeError: any) {
      console.error('[Stripe] Account link creation failed:', stripeError)
      return errorResponse(`Failed to create onboarding link: ${stripeError.message}`, 500)
    }
  } catch (error: any) {
    console.error('Member Stripe connect error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

/**
 * Get the status of a mosque's Stripe Connected Account (Member)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const { id } = await params

    const supabase = getServerSupabase(request)

    // Get mosque's Stripe account ID and verify ownership
    const { data: mosque, error: mosqueError } = await supabase
      .from('mosques')
      .select('stripe_account_id, user_id')
      .eq('id', id)
      .single()

    if (mosqueError || !mosque) {
      return errorResponse('Mosque not found', 404)
    }

    // Verify the user owns this mosque
    if (mosque.user_id !== authResult.user.id) {
      return errorResponse('Unauthorized - You do not own this mosque', 403)
    }

    if (!mosque.stripe_account_id) {
      return successResponse({
        connected: false,
        account: null
      })
    }

    // Fetch account details from Stripe
    try {
      const account = await stripe.accounts.retrieve(mosque.stripe_account_id)

      // Update database with latest status
      await supabase
        .from('mosques')
        .update({
          stripe_onboarding_complete: account.details_submitted,
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
          stripe_details_submitted: account.details_submitted,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      return successResponse({
        connected: true,
        account: {
          id: account.id,
          type: account.type,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements: account.requirements
        }
      })
    } catch (stripeError: any) {
      console.error('[Stripe] Failed to retrieve account:', stripeError)
      return errorResponse(`Failed to retrieve account status: ${stripeError.message}`, 500)
    }
  } catch (error: any) {
    console.error('Get Member Stripe status error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

