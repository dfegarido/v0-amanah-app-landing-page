import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { createAuthenticatedClient } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    // Await params (Next.js 15+ requirement)
    const resolvedParams = await params
    const subscriptionId = resolvedParams.id
    
    console.log('[Payment Alerts API] Resolving alert for subscription:', subscriptionId)

    // Get the access token from the request
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return errorResponse('No authentication token provided', 401)
    }

    // Create an authenticated Supabase client
    const supabase = createAuthenticatedClient(token)

    // Get request body for notes
    const body = await request.json().catch(() => ({}))
    const notes = body.notes || ''

    // First, check if subscription exists
    const { data: existingSubscription, error: checkError } = await supabase
      .from('subscriptions')
      .select('id, metadata')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (checkError) {
      console.error('[Payment Alerts API] Error checking subscription:', checkError)
      return errorResponse(`Database error: ${checkError.message}`, 500)
    }

    if (!existingSubscription) {
      console.error('[Payment Alerts API] Subscription not found:', subscriptionId)
      return errorResponse('Subscription not found', 404)
    }

    console.log('[Payment Alerts API] Found subscription, updating metadata...')

    // Add resolution info to metadata
    const updatedMetadata = {
      ...(existingSubscription.metadata || {}),
      alert_resolved_at: new Date().toISOString(),
      alert_resolved_by: authResult.user.id,
      alert_resolution_notes: notes,
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)

    if (updateError) {
      console.error('[Payment Alerts API] Error updating subscription:', updateError)
      return errorResponse(`Failed to update: ${updateError.message}`, 500)
    }

    console.log('[Payment Alerts API] Successfully resolved alert for subscription:', subscriptionId)

    return successResponse({
      resolved: true,
      resolvedAt: new Date().toISOString(),
    }, 'Alert marked as resolved')

  } catch (error: any) {
    console.error('Resolve payment alert error:', error)
    return errorResponse('Internal server error', 500)
  }
}

