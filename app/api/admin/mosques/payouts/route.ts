import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getSupabaseAdmin, createActivityLog } from '@/lib/admin-helpers'

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

/**
 * Process kickback payouts to mosque Stripe Connected Accounts
 * POST /api/admin/mosques/payouts
 */
export async function POST(request: NextRequest) {
  console.log('[Mosque Payouts API] POST request received')
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) {
      console.error('[Mosque Payouts API] Auth failed:', authResult.error)
      return authResult.error
    }

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      console.error('[Mosque Payouts API] User is not admin:', authResult.user.role)
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    console.log('[Mosque Payouts API] User authenticated:', authResult.user.email)

    const body = await request.json()
    const { mosque_id, period_start, period_end } = body

    if (!period_start || !period_end) {
      return errorResponse('period_start and period_end are required', 400)
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = getSupabaseAdmin()

    // Get mosques to process (either specific mosque or all with connected accounts)
    let mosquesToProcess: any[] = []

    if (mosque_id) {
      // Process specific mosque
      const { data: mosque, error: mosqueError } = await supabaseAdmin
        .from('mosques')
        .select('id, name, mosque_code, email, stripe_account_id, stripe_onboarding_complete, stripe_payouts_enabled')
        .eq('id', mosque_id)
        .single()

      if (mosqueError || !mosque) {
        console.error('[Mosque Payouts API] Mosque not found:', mosqueError)
        return errorResponse('Mosque not found', 404)
      }

      if (!mosque.stripe_account_id || !mosque.stripe_payouts_enabled) {
        return errorResponse('Mosque does not have payouts enabled', 400)
      }

      mosquesToProcess = [mosque]
    } else {
      // Process all mosques with connected accounts and payouts enabled
      const { data: mosques, error: mosquesError } = await supabaseAdmin
        .from('mosques')
        .select('id, name, mosque_code, email, stripe_account_id, stripe_onboarding_complete, stripe_payouts_enabled')
        .not('stripe_account_id', 'is', null)
        .eq('stripe_payouts_enabled', true)

      if (mosquesError) {
        console.error('[Mosque Payouts API] Failed to fetch mosques:', mosquesError)
        return errorResponse('Failed to fetch mosques', 500)
      }

      mosquesToProcess = mosques || []
    }

    console.log(`[Mosque Payouts API] Processing ${mosquesToProcess.length} mosques`)

    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    }

    // Process each mosque
    for (const mosque of mosquesToProcess) {
      try {
        console.log(`[Mosque Payouts API] Processing mosque: ${mosque.name} (Code: ${mosque.mosque_code})`)

        // Get affiliated businesses
        const { data: affiliatedBusinesses } = await supabaseAdmin
          .from('businesses')
          .select('id, name, subscription_id')
          .eq('affiliated_mosque_code', mosque.mosque_code)

        // Get affiliated coupons
        const { data: affiliatedCoupons } = await supabaseAdmin
          .from('coupons')
          .select('id, title, subscription_id')
          .eq('affiliated_mosque_code', mosque.mosque_code)

        // Get affiliated nonprofits
        const { data: affiliatedNonprofits } = await supabaseAdmin
          .from('nonprofits')
          .select('id, name, subscription_id')
          .eq('affiliated_mosque_code', mosque.mosque_code)

        console.log(`[Mosque Payouts API] Found ${affiliatedBusinesses?.length || 0} businesses, ${affiliatedCoupons?.length || 0} coupons, ${affiliatedNonprofits?.length || 0} nonprofits`)

        // Calculate kickback amount
        let totalKickback = 0
        const breakdown = {
          businesses: [] as any[],
          coupons: [] as any[],
          nonprofits: [] as any[]
        }

        // Process businesses
        for (const business of affiliatedBusinesses || []) {
          const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('id, price_amount, status, current_period_start, current_period_end')
            .eq('id', business.subscription_id)
            .eq('status', 'active')
            .single()

          if (subscription) {
            const kickback = subscription.price_amount * 0.10
            totalKickback += kickback
            breakdown.businesses.push({
              id: business.id,
              name: business.name,
              amount: kickback
            })
            console.log(`[Mosque Payouts API] Business: ${business.name} - $${kickback.toFixed(2)}`)
          }
        }

        // Process coupons
        for (const coupon of affiliatedCoupons || []) {
          const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('id, price_amount, status, current_period_start, current_period_end')
            .eq('id', coupon.subscription_id)
            .eq('status', 'active')
            .single()

          if (subscription) {
            const kickback = subscription.price_amount * 0.10
            totalKickback += kickback
            breakdown.coupons.push({
              id: coupon.id,
              title: coupon.title,
              amount: kickback
            })
            console.log(`[Mosque Payouts API] Coupon: ${coupon.title} - $${kickback.toFixed(2)}`)
          }
        }

        // Process nonprofits
        for (const nonprofit of affiliatedNonprofits || []) {
          const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('id, price_amount, status, current_period_start, current_period_end')
            .eq('id', nonprofit.subscription_id)
            .eq('status', 'active')
            .single()

          if (subscription) {
            const kickback = subscription.price_amount * 0.10
            totalKickback += kickback
            breakdown.nonprofits.push({
              id: nonprofit.id,
              name: nonprofit.name,
              amount: kickback
            })
            console.log(`[Mosque Payouts API] Nonprofit: ${nonprofit.name} - $${kickback.toFixed(2)}`)
          }
        }

        console.log(`[Mosque Payouts API] Calculated kickback for ${mosque.name}: $${totalKickback.toFixed(2)}`)

        // Skip if no kickback
        if (totalKickback <= 0) {
          console.log(`[Mosque Payouts API] No kickback to process for ${mosque.name}`)
          results.skipped++
          results.details.push({
            mosque_code: mosque.mosque_code,
            mosque_name: mosque.name,
            status: 'skipped',
            reason: 'No affiliates or zero kickback'
          })
          continue
        }

        // Create payout record
        const { data: payout, error: payoutError } = await supabaseAdmin
          .from('mosque_payouts')
          .insert({
            mosque_id: mosque.id,
            mosque_code: mosque.mosque_code,
            stripe_account_id: mosque.stripe_account_id,
            amount: totalKickback,
            period_start,
            period_end,
            status: 'processing',
            affiliate_breakdown: breakdown
          })
          .select()
          .single()

        if (payoutError) {
          console.error(`[Mosque Payouts API] Failed to create payout record:`, payoutError)
          results.failed++
          results.details.push({
            mosque_code: mosque.mosque_code,
            mosque_name: mosque.name,
            status: 'failed',
            error: 'Failed to create payout record'
          })
          continue
        }

        // Create Stripe transfer
        try {
          const transfer = await stripe.transfers.create({
            amount: Math.round(totalKickback * 100), // Convert to cents
            currency: 'usd',
            destination: mosque.stripe_account_id,
            description: `Affiliate earnings for ${mosque.name} (${period_start} to ${period_end})`,
            metadata: {
              mosque_id: mosque.id,
              mosque_code: mosque.mosque_code.toString(),
              payout_id: payout.id,
              period_start,
              period_end,
              businesses_count: breakdown.businesses.length.toString(),
              coupons_count: breakdown.coupons.length.toString(),
              nonprofits_count: breakdown.nonprofits.length.toString()
            }
          })

          console.log(`[Mosque Payouts API] Transfer created: ${transfer.id} for $${totalKickback.toFixed(2)}`)

          // Update payout record with transfer ID
          await supabaseAdmin
            .from('mosque_payouts')
            .update({
              stripe_transfer_id: transfer.id,
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('id', payout.id)

          results.successful++
          results.details.push({
            mosque_code: mosque.mosque_code,
            mosque_name: mosque.name,
            status: 'completed',
            amount: totalKickback,
            transfer_id: transfer.id
          })

        } catch (stripeError: any) {
          console.error(`[Mosque Payouts API] Stripe transfer failed:`, stripeError)

          // Update payout record with error
          await supabaseAdmin
            .from('mosque_payouts')
            .update({
              status: 'failed',
              error_message: stripeError.message
            })
            .eq('id', payout.id)

          results.failed++
          results.details.push({
            mosque_code: mosque.mosque_code,
            mosque_name: mosque.name,
            status: 'failed',
            error: stripeError.message
          })
        }

      } catch (error: any) {
        console.error(`[Mosque Payouts API] Error processing mosque ${mosque.mosque_code}:`, error)
        results.failed++
        results.details.push({
          mosque_code: mosque.mosque_code,
          mosque_name: mosque.name,
          status: 'failed',
          error: error.message
        })
      }
    }

    // Log activity
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await createActivityLog({
      adminId: authResult.user.id,
      action: 'other',
      actionDescription: `Processed mosque payouts: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`,
      entityType: 'mosque',
      metadata: {
        period_start,
        period_end,
        results
      },
      ipAddress,
      userAgent
    })

    console.log(`[Mosque Payouts API] Processing complete:`, results)

    return successResponse(results, `Processed ${mosquesToProcess.length} mosques`)

  } catch (error: any) {
    console.error('[Mosque Payouts API] Error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

/**
 * Get payout history
 * GET /api/admin/mosques/payouts
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const { searchParams } = new URL(request.url)
    const mosque_id = searchParams.get('mosque_id')
    const status = searchParams.get('status')

    const supabaseAdmin = getSupabaseAdmin()

    let query = supabaseAdmin
      .from('mosque_payouts')
      .select(`
        *,
        mosques (
          id,
          name,
          mosque_code
        )
      `)
      .order('created_at', { ascending: false })

    if (mosque_id) {
      query = query.eq('mosque_id', mosque_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: payouts, error } = await query

    if (error) {
      console.error('[Mosque Payouts API] Failed to fetch payouts:', error)
      return errorResponse('Failed to fetch payouts', 500)
    }

    return successResponse({ payouts })

  } catch (error: any) {
    console.error('[Mosque Payouts API] Error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

