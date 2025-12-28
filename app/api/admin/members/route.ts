import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { createAuthenticatedClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    // Get the access token from the request
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return errorResponse('No authentication token provided', 401)
    }

    // Create an authenticated Supabase client
    const supabase = createAuthenticatedClient(token)

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return errorResponse('Failed to fetch users', 500)
    }

    console.log('[Admin API] Fetched users:', users?.length || 0)

    if (!users || users.length === 0) {
      return successResponse({
        members: [],
        total: 0
      })
    }

    // For each user, fetch their subscriptions
    const membersWithSubscriptions = await Promise.all(
      users.map(async (user) => {
        // Fetch subscriptions for this user
        const { data: subscriptions, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)

        if (subError) {
          console.error(`Error fetching subscriptions for user ${user.id}:`, subError)
          return {
            ...user,
            subscriptions: []
          }
        }

        console.log(`[Admin API] User ${user.email} has ${subscriptions?.length || 0} subscriptions`)

        // For each subscription, fetch the related entity
        const subscriptionsWithEntities = await Promise.all(
          (subscriptions || []).map(async (subscription) => {
            let entity = null
            let entityTable = ''

            // Determine which table to query based on subscription type
            switch (subscription.type) {
              case 'mosque':
                entityTable = 'mosques'
                break
              case 'business':
                entityTable = 'businesses'
                break
              case 'coupon':
                entityTable = 'coupons'
                break
              case 'nonprofit':
                entityTable = 'nonprofits'
                break
              default:
                console.warn(`Unknown subscription type: ${subscription.type}`)
                return {
                  ...subscription,
                  entity: null
                }
            }

            // Fetch the entity
            const { data: entityData, error: entityError } = await supabase
              .from(entityTable)
              .select('*')
              .eq('subscription_id', subscription.id)
              .maybeSingle()

            if (entityError) {
              console.error(`Error fetching ${entityTable} for subscription ${subscription.id}:`, entityError)
            } else if (entityData) {
              entity = entityData
              console.log(`[Admin API] Found ${entityTable} entity:`, entity?.name || entity?.title || 'unnamed')
            } else {
              console.warn(`No ${entityTable} entity found for subscription ${subscription.id}`)
            }

            return {
              ...subscription,
              entity
            }
          })
        )

        // Filter out subscriptions without entities (orphaned subscriptions)
        const validSubscriptions = subscriptionsWithEntities.filter(sub => sub.entity !== null)

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          role: user.role,
          createdAt: user.created_at,
          subscriptions: validSubscriptions.map(sub => ({
            ...sub,
            // Map database fields to frontend expected fields
            price: sub.price_amount,
            interval: 'month', // Default to monthly
            next_billing_date: sub.next_billing_date,
            created_at: sub.created_at,
            app_status: sub.app_status // Ensure app_status is included
          }))
        }
      })
    )

    return successResponse({
      members: membersWithSubscriptions,
      total: membersWithSubscriptions.length
    })
  } catch (error: any) {
    console.error('Get members error:', error)
    return errorResponse('Internal server error', 500)
  }
}
