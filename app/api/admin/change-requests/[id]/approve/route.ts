import { NextRequest } from 'next/server'
import { successResponse, errorResponse, requireAuth, parseRequestBody } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

interface ApproveRequestBody {
  review_notes?: string
}

// POST /api/admin/change-requests/[id]/approve - Approve a change request
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
    const body = await parseRequestBody<ApproveRequestBody>(request)
    
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

    // Get the table name
    const getTableName = (type: string): string => {
      if (type === 'business') return 'businesses'
      return `${type}s`
    }

    const tableName = getTableName(changeRequest.subscription_type)

    // Filter and map changes to match database schema
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    // Apply changes, filtering out invalid fields and mapping field names
    for (const [key, value] of Object.entries(changeRequest.changes)) {
      // Skip fields that don't belong in entity tables
      if (key === 'additional_donations') {
        // Handle this separately later
        continue
      }
      
      // Map field names if necessary
      if (changeRequest.subscription_type === 'mosque') {
        // Mosques use 'description' not 'about'
        if (key === 'about') {
          updateData.description = value
        } else {
          updateData[key] = value
        }
      } else if (changeRequest.subscription_type === 'nonprofit') {
        // Nonprofits use 'about' not 'description'
        if (key === 'description') {
          updateData.about = value
        } else {
          updateData[key] = value
        }
      } else if (changeRequest.subscription_type === 'coupon') {
        // Coupons use 'title' not 'name'
        if (key === 'name') {
          updateData.title = value
        } else {
          updateData[key] = value
        }
      } else {
        // For business, apply as-is
        updateData[key] = value
      }
    }

    // Only update entity if there are changes to apply
    let updatedEntity = null
    if (Object.keys(updateData).length > 0) {
      const { data: entityData, error: updateError } = await supabaseAdmin
        .from(tableName)
        .update(updateData)
        .eq('subscription_id', changeRequest.subscription_id)
        .select()
        .single()

      if (updateError) {
        console.error(`Error applying changes to ${tableName}:`, updateError)
        return errorResponse(`Failed to apply changes`, 500)
      }
      
      updatedEntity = entityData
    } else {
      console.log('[Approve] No entity changes to apply, only additional donations')
    }

    // Handle additional donations if they were changed
    if (changeRequest.changes.additional_donations) {
      console.log('[Approve] Updating additional donations...')
      
      // Delete existing donations for this subscription
      const { error: deleteError } = await supabaseAdmin
        .from('additional_donations')
        .delete()
        .eq('subscription_id', changeRequest.subscription_id)

      if (deleteError) {
        console.error('Error deleting old donations:', deleteError)
        // Continue even if delete fails
      }

      // Insert new donations
      if (changeRequest.changes.additional_donations.length > 0) {
        const donationsToInsert = changeRequest.changes.additional_donations.map((d: any) => ({
          subscription_id: changeRequest.subscription_id,
          organization_type: d.type,
          organization_id: d.id,
          amount_per_month: parseFloat(d.amount)
        }))

        const { error: insertError } = await supabaseAdmin
          .from('additional_donations')
          .insert(donationsToInsert)

        if (insertError) {
          console.error('Error inserting new donations:', insertError)
          // Continue even if insert fails - the main entity update succeeded
        } else {
          console.log('[Approve] Successfully updated additional donations')
        }
      }
    }

    // Update the change request status
    const { error: statusUpdateError } = await supabaseAdmin
      .from('subscription_change_requests')
      .update({
        status: 'approved',
        reviewed_by: authResult.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: body?.review_notes || null
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
      p_title: '✅ Change Request Approved',
      p_message: `Your change request for ${changeRequest.subscription_type} subscription has been approved and applied.`,
      p_metadata: {
        change_request_id: changeRequestId,
        subscription_id: changeRequest.subscription_id,
        subscription_type: changeRequest.subscription_type,
        approved_by: authResult.user.id
      },
      p_related_entity_type: 'subscription',
      p_related_entity_id: changeRequest.subscription_id
    })

    if (notifError) {
      console.error('Error creating notification:', notifError)
      // Don't fail the request if notification fails
    }

    console.log(`✅ Change request ${changeRequestId} approved by admin ${authResult.user.email}`)

    return successResponse(
      { changeRequest, updatedEntity },
      'Change request approved successfully'
    )
  } catch (error: any) {
    console.error('Approve change request error:', error)
    return errorResponse('Internal server error', 500)
  }
}

