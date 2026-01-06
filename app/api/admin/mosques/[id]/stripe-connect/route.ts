import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getSupabaseAdmin, createActivityLog } from '@/lib/admin-helpers'

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * Create a Stripe Connected Account link for onboarding
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  console.log('[Stripe Connect API] POST request received')
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) {
      console.error('[Stripe Connect API] Auth failed:', authResult.error)
      return authResult.error
    }

    console.log('[Stripe Connect API] User authenticated:', authResult.user.email)

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      console.error('[Stripe Connect API] User is not admin:', authResult.user.role)
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const { id } = await params
    console.log('[Stripe Connect API] Mosque ID:', id)
    
    const body = await request.json()
    const { refresh } = body // If true, create a new account link for existing account
    console.log('[Stripe Connect API] Refresh mode:', refresh)

    // Check Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Stripe Connect API] STRIPE_SECRET_KEY not configured')
      return errorResponse('Stripe is not configured', 500)
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = getSupabaseAdmin()

    // Get mosque details
    const { data: mosque, error: mosqueError } = await supabaseAdmin
      .from('mosques')
      .select('id, name, email, stripe_account_id')
      .eq('id', id)
      .single()

    if (mosqueError || !mosque) {
      console.error('[Stripe Connect API] Mosque not found:', mosqueError)
      return errorResponse('Mosque not found', 404)
    }

    console.log('[Stripe Connect API] Mosque found:', mosque.name)
    console.log('[Stripe Connect API] Existing account ID:', mosque.stripe_account_id)

    let accountId = mosque.stripe_account_id

    // If no account exists, create one
    if (!accountId) {
      console.log('[Stripe Connect API] Creating new Stripe account...')
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
            mosque_name: mosque.name
          }
        })

        accountId = account.id

        // Save the account ID to the database
        await supabaseAdmin
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
    console.log('[Stripe Connect API] Creating account link for:', accountId)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    console.log('[Stripe Connect API] Using app URL:', appUrl)
    
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${appUrl}/admin?stripe_refresh=true&mosque_id=${id}`,
        return_url: `${appUrl}/admin?stripe_success=true&mosque_id=${id}`,
        type: 'account_onboarding',
      })

      console.log('[Stripe Connect API] Account link created successfully:', accountLink.url)

      // Log activity
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      const userAgent = request.headers.get('user-agent') || undefined

      await createActivityLog({
        adminId: authResult.user.id,
        action: 'other',
        actionDescription: refresh ? 'Refreshed Stripe onboarding link' : 'Initiated Stripe account connection',
        entityType: 'mosque',
        entityId: id,
        entityName: mosque.name,
        metadata: {
          stripe_account_id: accountId,
          action: refresh ? 'refresh' : 'create'
        },
        ipAddress,
        userAgent
      })

      console.log('[Stripe Connect API] Returning success response with URL')
      return successResponse({
        url: accountLink.url,
        account_id: accountId
      })
    } catch (stripeError: any) {
      console.error('[Stripe] Account link creation failed:', stripeError)
      return errorResponse(`Failed to create onboarding link: ${stripeError.message}`, 500)
    }
  } catch (error: any) {
    console.error('Stripe connect error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

/**
 * Get the status of a mosque's Stripe Connected Account
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const { id } = await params

    // Use admin client to bypass RLS
    const supabaseAdmin = getSupabaseAdmin()

    // Get mosque's Stripe account ID
    const { data: mosque, error: mosqueError } = await supabaseAdmin
      .from('mosques')
      .select('stripe_account_id')
      .eq('id', id)
      .single()

    if (mosqueError || !mosque || !mosque.stripe_account_id) {
      return successResponse({
        connected: false,
        account: null
      })
    }

    // Fetch account details from Stripe
    try {
      const account = await stripe.accounts.retrieve(mosque.stripe_account_id)

      // Update database with latest status
      await supabaseAdmin
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
    console.error('Get Stripe status error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

/**
 * Disconnect a Stripe Connected Account
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const { id } = await params

    // Use admin client to bypass RLS
    const supabaseAdmin = getSupabaseAdmin()

    // Get mosque details
    const { data: mosque, error: mosqueError } = await supabaseAdmin
      .from('mosques')
      .select('id, name, stripe_account_id')
      .eq('id', id)
      .single()

    if (mosqueError || !mosque || !mosque.stripe_account_id) {
      return errorResponse('No Stripe account connected', 404)
    }

    // Note: We don't actually delete the Stripe account, just disconnect it from our platform
    // The account owner can still access it directly through Stripe
    await supabaseAdmin
      .from('mosques')
      .update({
        stripe_account_id: null,
        stripe_onboarding_complete: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        stripe_details_submitted: false,
        stripe_connected_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    // Log activity
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await createActivityLog({
      adminId: authResult.user.id,
      action: 'other',
      actionDescription: 'Disconnected Stripe account',
      entityType: 'mosque',
      entityId: id,
      entityName: mosque.name,
      metadata: {
        stripe_account_id: mosque.stripe_account_id
      },
      ipAddress,
      userAgent
    })

    return successResponse({ disconnected: true })
  } catch (error: any) {
    console.error('Disconnect Stripe error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

