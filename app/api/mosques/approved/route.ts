import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/auth'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/mosques/approved - Get only approved active mosques owned by the current user
// Returns mosques that have approved subscriptions (app_status = 'active') and belong to the current user
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const supabase = getServerSupabase(request)
    const userId = authResult.user.id

    // First, let's check ALL mosque subscriptions for this user (for debugging)
    const { data: allUserSubscriptions } = await supabase
      .from('subscriptions')
      .select('id, app_status, status, user_id')
      .eq('type', 'mosque')
      .eq('user_id', userId)
    
    console.log('[Approved Mosques API] ALL user mosque subscriptions:', allUserSubscriptions?.length || 0)
    if (allUserSubscriptions) {
      allUserSubscriptions.forEach((sub: any) => {
        console.log(`  - Subscription ${sub.id}: app_status="${sub.app_status}", status="${sub.status}"`)
      })
    }

    // Get approved mosque subscriptions (app_status = 'active') for the current user only
    // This matches the same filtering logic used in the subscriptions page
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('id, app_status, status, user_id')
      .eq('type', 'mosque')
      .eq('user_id', userId)       // Only user's own mosques
      .eq('app_status', 'active')  // Only approved mosques
      .eq('status', 'active')      // Only active payment status

    if (subsError) {
      console.error('[Approved Mosques API] Error fetching mosque subscriptions:', subsError)
      return errorResponse('Failed to fetch mosque subscriptions', 500)
    }

    console.log('[Approved Mosques API] Found approved mosque subscriptions for user:', subscriptions?.length || 0)

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Approved Mosques API] No approved mosque subscriptions found')
      return successResponse({ mosques: [] })
    }

    // Get subscription IDs
    const subscriptionIds = subscriptions.map(s => s.id)
    console.log('[Approved Mosques API] Subscription IDs:', subscriptionIds)

    // Fetch mosques that have these approved subscriptions
    // Make sure subscription_id is not null and matches one of the approved subscription IDs
    const { data: allMosques, error: mosquesError } = await supabase
      .from('mosques')
      .select('id, name, mosque_code, status, subscription_id')
      .in('subscription_id', subscriptionIds)
      .not('subscription_id', 'is', null)  // Ensure subscription_id is not null
      .order('mosque_code', { ascending: true })

    if (mosquesError) {
      console.error('[Approved Mosques API] Error fetching mosques:', mosquesError)
      return errorResponse('Failed to fetch mosques', 500)
    }

    console.log('[Approved Mosques API] ALL mosques fetched:', allMosques?.length || 0)
    if (allMosques) {
      allMosques.forEach((m: any) => {
        console.log(`  - Mosque #${m.mosque_code} "${m.name}": entity status="${m.status}", subscription_id=${m.subscription_id}`)
      })
    }

    // Filter mosques by status = 'active' (entity status must be active)
    const mosques = (allMosques || []).filter((m: any) => m.status === 'active')

    // Double-check each mosque's subscription status
    const verifiedMosques = []
    for (const mosque of mosques) {
      const sub = subscriptions.find((s: any) => s.id === mosque.subscription_id)
      if (sub && sub.app_status === 'active' && sub.status === 'active') {
        verifiedMosques.push(mosque)
      } else {
        console.log(`[Approved Mosques API] Excluding mosque #${mosque.mosque_code} - subscription status mismatch`)
      }
    }

    console.log('[Approved Mosques API] All user mosques with subscription_ids:', allMosques?.length || 0)
    console.log('[Approved Mosques API] User mosques with active status:', mosques?.length || 0)
    console.log('[Approved Mosques API] Final verified user mosques:', verifiedMosques.length, verifiedMosques.map((m: any) => `#${m.mosque_code} - ${m.name}`))

    return successResponse({ mosques: verifiedMosques })
  } catch (error: any) {
    console.error('[Approved Mosques API] Get approved mosques error:', error)
    return errorResponse('Internal server error', 500)
  }
}

