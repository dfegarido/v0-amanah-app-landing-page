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

    // Fetch subscriptions with payment issues (past_due, unpaid)
    const { data: problemSubscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .in('status', ['past_due', 'unpaid'])
      .order('updated_at', { ascending: false })

    if (subsError) {
      console.error('Error fetching problem subscriptions:', subsError)
      return errorResponse('Failed to fetch payment alerts', 500)
    }

    // Fetch new subscriptions pending verification (successful payment, waiting for admin approval)
    const { data: pendingSubscriptions, error: pendingError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .eq('app_status', 'pending_verification')
      .order('created_at', { ascending: false })

    if (pendingError) {
      console.error('Error fetching pending subscriptions:', pendingError)
      return errorResponse('Failed to fetch pending submissions', 500)
    }

    // Combine both types of alerts
    const allSubscriptions = [
      ...(problemSubscriptions || []),
      ...(pendingSubscriptions || [])
    ]

    console.log('[Payment Alerts API] Found payment issues:', problemSubscriptions?.length || 0)
    console.log('[Payment Alerts API] Found pending verifications:', pendingSubscriptions?.length || 0)

    if (allSubscriptions.length === 0) {
      return successResponse({ alerts: [] })
    }

    // For each subscription, fetch the user and entity details
    const alertsWithDetails = await Promise.all(
      allSubscriptions.map(async (subscription) => {
        // Fetch user details
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, name, email, phone')
          .eq('id', subscription.user_id)
          .single()

        if (userError) {
          console.error(`Error fetching user for subscription ${subscription.id}:`, userError)
          return null
        }

        // Fetch entity details based on subscription type
        let entity = null
        let entityTable = ''
        
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
            return null
        }

        const { data: entityData, error: entityError } = await supabase
          .from(entityTable)
          .select('*')
          .eq('subscription_id', subscription.id)
          .maybeSingle()

        if (entityError) {
          console.error(`Error fetching ${entityTable} for subscription ${subscription.id}:`, entityError)
        } else if (entityData) {
          entity = entityData
          console.log(`[Payment Alerts API] Found ${entityTable} for subscription ${subscription.id}:`, 
            { name: entityData.name, title: entityData.title })
        } else {
          console.warn(`[Payment Alerts API] No ${entityTable} found for subscription ${subscription.id}`)
        }

        // Determine alert type based on subscription status and app_status
        let alertType = 'payment_failed'
        if (subscription.status === 'active' && subscription.app_status === 'pending_verification') {
          alertType = 'new_submission'
        } else if (subscription.status === 'past_due') {
          alertType = 'payment_retry'
        } else if (subscription.status === 'unpaid') {
          alertType = 'payment_failed'
        }
        
        // Check if already resolved in metadata
        const isResolved = subscription.metadata?.alert_resolved_at ? true : false
        
        // Determine subscription name based on entity type
        let subscriptionName = 'Unnamed'
        if (entity) {
          if (subscription.type === 'coupon') {
            subscriptionName = entity.title || entity.name || 'Unnamed Coupon'
          } else {
            subscriptionName = entity.name || entity.title || `Unnamed ${subscription.type}`
          }
        }
        
        return {
          id: subscription.id,
          memberId: user.id,
          memberName: user.name,
          memberEmail: user.email,
          memberPhone: user.phone,
          subscriptionId: subscription.id,
          subscriptionType: subscription.type,
          subscriptionName: subscriptionName,
          alertType: alertType,
          status: subscription.status,
          appStatus: subscription.app_status,
          stripeSubscriptionId: subscription.stripe_subscription_id,
          priceAmount: subscription.price_amount,
          currentPeriodEnd: subscription.current_period_end,
          createdAt: alertType === 'new_submission' ? subscription.created_at : subscription.updated_at,
          resolved: isResolved,
          resolvedAt: subscription.metadata?.alert_resolved_at,
          metadata: subscription.metadata || {},
        }
      })
    )

    // Filter out null results (failed fetches) and orphaned subscriptions (no entity)
    const validAlerts = alertsWithDetails.filter(alert => {
      if (alert === null) return false
      
      // For new submissions, filter out subscriptions with no entity (data integrity issue)
      if (alert.alertType === 'new_submission' && alert.subscriptionName === 'Unnamed') {
        console.warn(`[Payment Alerts API] Skipping orphaned subscription ${alert.id} - no entity found in database`)
        return false
      }
      
      return true
    })

    const orphanedCount = alertsWithDetails.length - validAlerts.length
    if (orphanedCount > 0) {
      console.warn(`[Payment Alerts API] Found ${orphanedCount} orphaned subscriptions (subscriptions exist but entity records are missing)`)
    }

    // Dedupe new-submission alerts that represent accidental duplicate signups
    // (same member + type + same display name). Keep the newest record for review.
    const dedupedAlerts = new Map<string, any>()
    for (const alert of validAlerts) {
      if (alert.alertType !== 'new_submission') {
        dedupedAlerts.set(`id:${alert.id}`, alert)
        continue
      }

      const key = [
        'new_submission',
        alert.memberId,
        alert.subscriptionType,
        String(alert.subscriptionName || '').trim().toLowerCase(),
      ].join('|')

      const existing = dedupedAlerts.get(key)
      if (!existing) {
        dedupedAlerts.set(key, alert)
        continue
      }

      const existingTs = new Date(existing.createdAt || 0).getTime()
      const currentTs = new Date(alert.createdAt || 0).getTime()
      if (currentTs >= existingTs) {
        dedupedAlerts.set(key, alert)
      }
    }

    const alerts = Array.from(dedupedAlerts.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )

    console.log('[Payment Alerts API] Returning alerts:', alerts.length)

    return successResponse({ 
      alerts,
      total: alerts.length 
    })

  } catch (error: any) {
    console.error('Get payment alerts error:', error)
    return errorResponse('Internal server error', 500)
  }
}

