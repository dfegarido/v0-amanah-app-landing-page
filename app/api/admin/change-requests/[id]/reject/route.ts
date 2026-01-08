import { NextRequest } from 'next/server'
import { successResponse, errorResponse, requireAuth, parseRequestBody } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

interface RejectRequestBody {
  review_notes: string
}

// POST /api/admin/change-requests/[id]/reject - Reject a change request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Verify user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized. Admin access required.', 403)
    }

    const { id } = await params
    const changeRequestId = id
    const body = await parseRequestBody<RejectRequestBody>(request)
    
    if (!body || !body.review_notes) {
      return errorResponse('Review notes are required when rejecting a change request', 400)
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get the change request
    const { data: changeRequest, error: fetchError } = await supabaseAdmin
      .from('subscription_change_requests')
      .select('*')
      .eq('id', changeRequestId)
      .single()

    if (fetchError || !changeRequest) {
      console.error('Error fetching change request:', fetchError)
      return errorResponse('Change request not found', 404)
    }

    // Check if already processed
    if (changeRequest.status !== 'pending') {
      return errorResponse(`Change request already ${changeRequest.status}`, 400)
    }

    // Update the change request status
    const { error: statusUpdateError } = await supabaseAdmin
      .from('subscription_change_requests')
      .update({
        status: 'rejected',
        reviewed_by: authResult.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: body.review_notes
      })
      .eq('id', changeRequestId)

    if (statusUpdateError) {
      console.error('Error updating change request status:', statusUpdateError)
      return errorResponse('Failed to update change request status', 500)
    }

    // Send notification to the requester
    const { error: notifError } = await supabaseAdmin.rpc('create_notification', {
      p_user_id: changeRequest.user_id,
      p_type: 'admin_action',
      p_title: '❌ Change Request Rejected',
      p_message: `Your change request for ${changeRequest.subscription_type} subscription has been rejected. Reason: ${body.review_notes}`,
      p_metadata: {
        change_request_id: changeRequestId,
        subscription_id: changeRequest.subscription_id,
        subscription_type: changeRequest.subscription_type,
        rejected_by: authResult.user.id,
        reason: body.review_notes
      },
      p_related_entity_type: 'subscription',
      p_related_entity_id: changeRequest.subscription_id
    })

    if (notifError) {
      console.error('Error creating notification:', notifError)
      // Don't fail the request if notification fails
    }

    console.log(`❌ Change request ${changeRequestId} rejected by admin ${authResult.user.email}`)

    return successResponse(
      { changeRequest },
      'Change request rejected successfully'
    )
  } catch (error: any) {
    console.error('Reject change request error:', error)
    return errorResponse('Internal server error', 500)
  }
}

