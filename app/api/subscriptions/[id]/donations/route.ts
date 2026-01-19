import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { createAuthenticatedClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const { id: subscriptionId } = await params

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return errorResponse('No authentication token provided', 401)
    }

    const supabase = createAuthenticatedClient(token)

    // Verify subscription belongs to user
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id')
      .eq('id', subscriptionId)
      .single()

    if (subError || !subscription) {
      return errorResponse('Subscription not found', 404)
    }

    if (subscription.user_id !== authResult.user.id) {
      return errorResponse('Unauthorized', 403)
    }

    // Fetch additional donations for this subscription
    const { data: donations, error: donationsError } = await supabase
      .from('additional_donations')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: true })

    if (donationsError) {
      console.error('Error fetching additional donations:', donationsError)
      return errorResponse('Failed to fetch donations', 500)
    }

    // Fetch organization details for each donation
    const donationsWithDetails = await Promise.all(
      (donations || []).map(async (donation) => {
        if (donation.organization_type === 'mosque') {
          const { data: mosque } = await supabase
            .from('mosques')
            .select('id, name, mosque_code')
            .eq('id', donation.organization_id)
            .single()

          return {
            ...donation,
            organizationName: mosque?.name || 'Unknown Mosque',
            organizationCode: mosque?.mosque_code,
          }
        } else if (donation.organization_type === 'nonprofit') {
          const { data: nonprofit } = await supabase
            .from('nonprofits')
            .select('id, name')
            .eq('id', donation.organization_id)
            .single()

          return {
            ...donation,
            organizationName: nonprofit?.name || 'Unknown Nonprofit',
          }
        }
        return donation
      })
    )

    return successResponse({
      donations: donationsWithDetails,
    })
  } catch (error: any) {
    console.error('Get additional donations error:', error)
    return errorResponse('Internal server error', 500)
  }
}

