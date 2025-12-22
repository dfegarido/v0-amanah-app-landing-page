import { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/auth'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/subscriptions - Get user's subscriptions
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const supabase = getServerSupabase(request)

    // Get all subscriptions for the user
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError)
      return errorResponse('Failed to fetch subscriptions', 500)
    }

    // Fetch related entities for each subscription
    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        let entity = null
        let entityError = null

        switch (sub.type) {
          case 'mosque':
            const { data: mosque, error: mosqueErr } = await supabase
              .from('mosques')
              .select('*')
              .eq('subscription_id', sub.id)
              .single()
            entity = mosque
            entityError = mosqueErr
            break

          case 'business':
            const { data: business, error: businessErr } = await supabase
              .from('businesses')
              .select('*')
              .eq('subscription_id', sub.id)
              .single()
            entity = business
            entityError = businessErr
            break

          case 'coupon':
            const { data: coupon, error: couponErr } = await supabase
              .from('coupons')
              .select('*')
              .eq('subscription_id', sub.id)
              .single()
            entity = coupon
            entityError = couponErr
            break

          case 'nonprofit':
            const { data: nonprofit, error: nonprofitErr } = await supabase
              .from('nonprofits')
              .select('*')
              .eq('subscription_id', sub.id)
              .single()
            entity = nonprofit
            entityError = nonprofitErr
            break
        }

        return {
          ...sub,
          entity,
          entityError: entityError ? entityError.message : null
        }
      })
    )

    // Filter out subscriptions without entity records (orphaned subscriptions)
    const validSubscriptions = enrichedSubscriptions.filter(sub => sub.entity !== null)

    return successResponse(validSubscriptions)

  } catch (error: any) {
    console.error('Get subscriptions error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

