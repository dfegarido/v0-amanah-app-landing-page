import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request)
    if (authResult.error) {
      return authResult.error
    }
    
    const user = authResult.user

    const { searchParams } = new URL(request.url)
    const mosqueCode = searchParams.get('mosqueCode')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!mosqueCode) {
      return errorResponse('Mosque code is required', 400)
    }

    console.log(`[Mosque Affiliates API] Fetching affiliates for mosque code: ${mosqueCode}`)

    // Fetch affiliated businesses
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select(`
        id,
        name,
        affiliated_mosque_code,
        subscription_id,
        subscriptions!inner (
          id,
          status,
          price_amount,
          created_at,
          current_period_start,
          current_period_end,
          cancelled_at
        )
      `)
      .eq('affiliated_mosque_code', parseInt(mosqueCode))

    if (businessError) {
      console.error('[Mosque Affiliates API] Error fetching businesses:', businessError)
    }

    // Fetch affiliated coupons
    const { data: coupons, error: couponError } = await supabase
      .from('coupons')
      .select(`
        id,
        title,
        affiliated_mosque_code,
        subscription_id,
        subscriptions!inner (
          id,
          status,
          price_amount,
          created_at,
          current_period_start,
          current_period_end,
          cancelled_at
        )
      `)
      .eq('affiliated_mosque_code', parseInt(mosqueCode))

    if (couponError) {
      console.error('[Mosque Affiliates API] Error fetching coupons:', couponError)
    }

    // Fetch affiliated nonprofits
    const { data: nonprofits, error: nonprofitError } = await supabase
      .from('nonprofits')
      .select(`
        id,
        name,
        affiliated_mosque_code,
        subscription_id,
        subscriptions!inner (
          id,
          status,
          price_amount,
          created_at,
          current_period_start,
          current_period_end,
          cancelled_at
        )
      `)
      .eq('affiliated_mosque_code', parseInt(mosqueCode))

    if (nonprofitError) {
      console.error('[Mosque Affiliates API] Error fetching nonprofits:', nonprofitError)
    }

    // Process and format the data
    const affiliates: any[] = []
    
    // Process businesses
    if (businesses) {
      console.log('[Mosque Affiliates API] Processing businesses:', JSON.stringify(businesses, null, 2))
      businesses.forEach((business: any) => {
        // Handle both single object and array responses
        const subscription = Array.isArray(business.subscriptions) 
          ? business.subscriptions[0] 
          : business.subscriptions
        
        if (subscription) {
          console.log('[Mosque Affiliates API] Business subscription:', JSON.stringify(subscription, null, 2))
          
          // price_amount is already stored in dollars in the database
          const feeInDollars = subscription.price_amount
          
          affiliates.push({
            id: business.id,
            name: business.name,
            type: 'business',
            subscriptionId: subscription.id,
            fee: feeInDollars,
            kickback: feeInDollars * 0.10,
            status: subscription.status,
            createdAt: subscription.created_at,
            periodStart: subscription.current_period_start,
            periodEnd: subscription.current_period_end,
            cancelledAt: subscription.cancelled_at
          })
        }
      })
    }

    // Process coupons
    if (coupons) {
      console.log('[Mosque Affiliates API] Processing coupons:', JSON.stringify(coupons, null, 2))
      coupons.forEach((coupon: any) => {
        // Handle both single object and array responses
        const subscription = Array.isArray(coupon.subscriptions)
          ? coupon.subscriptions[0]
          : coupon.subscriptions
        
        if (subscription) {
          console.log('[Mosque Affiliates API] Coupon subscription:', JSON.stringify(subscription, null, 2))
          
          // price_amount is already stored in dollars in the database
          const feeInDollars = subscription.price_amount
          
          affiliates.push({
            id: coupon.id,
            name: coupon.title,
            type: 'coupon',
            subscriptionId: subscription.id,
            fee: feeInDollars,
            kickback: feeInDollars * 0.10,
            status: subscription.status,
            createdAt: subscription.created_at,
            periodStart: subscription.current_period_start,
            periodEnd: subscription.current_period_end,
            cancelledAt: subscription.cancelled_at
          })
        }
      })
    }

    // Process nonprofits
    if (nonprofits) {
      console.log('[Mosque Affiliates API] Processing nonprofits:', JSON.stringify(nonprofits, null, 2))
      nonprofits.forEach((nonprofit: any) => {
        // Handle both single object and array responses
        const subscription = Array.isArray(nonprofit.subscriptions)
          ? nonprofit.subscriptions[0]
          : nonprofit.subscriptions
        
        if (subscription) {
          console.log('[Mosque Affiliates API] Nonprofit subscription:', JSON.stringify(subscription, null, 2))
          
          // price_amount is already stored in dollars in the database
          const feeInDollars = subscription.price_amount
          
          affiliates.push({
            id: nonprofit.id,
            name: nonprofit.name,
            type: 'nonprofit',
            subscriptionId: subscription.id,
            fee: feeInDollars,
            kickback: feeInDollars * 0.10,
            status: subscription.status,
            createdAt: subscription.created_at,
            periodStart: subscription.current_period_start,
            periodEnd: subscription.current_period_end,
            cancelledAt: subscription.cancelled_at
          })
        }
      })
    }

    // Calculate earnings summary
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const currentMonthAffiliates = affiliates.filter(a => {
      if (a.status !== 'active') return false
      const periodStart = new Date(a.periodStart)
      return periodStart.getMonth() === currentMonth && periodStart.getFullYear() === currentYear
    })

    const previousMonthsAffiliates = affiliates.filter(a => {
      if (a.cancelledAt) {
        const cancelledDate = new Date(a.cancelledAt)
        return cancelledDate < now
      }
      if (a.status !== 'active') return false
      const periodStart = new Date(a.periodStart)
      return periodStart < new Date(currentYear, currentMonth, 1)
    })

    const pendingEarnings = currentMonthAffiliates.reduce((sum, a) => sum + a.kickback, 0)
    const paidEarnings = previousMonthsAffiliates.reduce((sum, a) => sum + a.kickback, 0)
    const totalEarnings = pendingEarnings + paidEarnings
    const activeAffiliatesCount = affiliates.filter(a => a.status === 'active').length

    console.log(`[Mosque Affiliates API] Found ${affiliates.length} total affiliates, ${activeAffiliatesCount} active`)
    console.log(`[Mosque Affiliates API] Pending: $${pendingEarnings}, Paid: $${paidEarnings}, Total: $${totalEarnings}`)

    return successResponse({
      affiliates,
      summary: {
        pendingEarnings,
        paidEarnings,
        totalEarnings,
        activeAffiliatesCount
      }
    })

  } catch (error: any) {
    console.error('[Mosque Affiliates API] Error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

