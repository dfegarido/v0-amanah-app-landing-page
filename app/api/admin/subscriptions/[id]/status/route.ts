import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const { id } = await params
    const body = await request.json()
    const { app_status, entity_status } = body

    if (!app_status && !entity_status) {
      return errorResponse('Missing app_status or entity_status', 400)
    }

    const supabase = getServerSupabase(request)

    // Use service role key to bypass RLS for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get subscription to find the entity type (use admin client to bypass RLS)
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('type, user_id')
      .eq('id', id)
      .single()

    if (subError || !subscription) {
      console.error('Subscription lookup error:', subError)
      console.error('Subscription ID:', id)
      return errorResponse('Subscription not found', 404)
    }

    // Update subscription app_status if provided (use admin client to bypass RLS)
    if (app_status) {
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          app_status,
          added_to_app: app_status === 'active',
          added_to_app_date: app_status === 'active' ? new Date().toISOString() : null,
          removed_from_app_date: app_status === 'removed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
        return errorResponse('Failed to update subscription status', 500)
      }
    }

    // Update entity status if provided
    if (entity_status) {
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
          return errorResponse('Unknown subscription type', 400)
      }

      const { error: entityError } = await supabaseAdmin
        .from(entityTable)
        .update({
          status: entity_status,
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', id)

      if (entityError) {
        console.error('Error updating entity status:', entityError)
        return errorResponse('Failed to update entity status', 500)
      }
    }

    return successResponse({
      subscription_id: id,
      app_status: app_status || 'unchanged',
      entity_status: entity_status || 'unchanged'
    }, 'Status updated successfully')
  } catch (error: any) {
    console.error('Update subscription status error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

