import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * Update manual donation amount for a mosque (Admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  console.log('[Admin Manual Donation API] PATCH request received')
  try {
    // Verify auth
    const authResult = await requireAuth(request)
    if (authResult.error) {
      console.error('[Admin Manual Donation API] Auth failed:', authResult.error)
      return authResult.error
    }

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      console.error('[Admin Manual Donation API] User is not admin:', authResult.user.email)
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    console.log('[Admin Manual Donation API] Admin authenticated:', authResult.user.email)

    const { id } = await params
    console.log('[Admin Manual Donation API] Mosque ID:', id)

    const body = await request.json()
    const { amount } = body

    console.log('[Admin Manual Donation API] Amount:', amount)

    // Validate amount
    if (amount === undefined || amount === null) {
      return errorResponse('Amount is required', 400)
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount < 0) {
      return errorResponse('Amount must be a positive number', 400)
    }

    const supabase = getSupabaseAdmin()

    // Verify mosque exists
    const { data: mosque, error: mosqueError } = await supabase
      .from('mosques')
      .select('id, name, mosque_code')
      .eq('id', id)
      .single()

    if (mosqueError || !mosque) {
      console.error('[Admin Manual Donation API] Mosque not found:', mosqueError)
      return errorResponse('Mosque not found', 404)
    }

    console.log('[Admin Manual Donation API] Found mosque:', mosque.name)

    // Update manual donation amount
    const { data: updatedMosque, error: updateError } = await supabase
      .from('mosques')
      .update({
        manual_donations: numAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Admin Manual Donation API] Update failed:', updateError)
      return errorResponse('Failed to update manual donation', 500)
    }

    console.log('[Admin Manual Donation API] Successfully updated manual donation to:', numAmount)

    // Log admin activity
    try {
      await supabase.from('admin_activity_log').insert({
        admin_id: authResult.user.id,
        action: 'update_manual_donation',
        entity_type: 'mosque',
        entity_id: id,
        details: {
          mosque_id: id,
          mosque_name: mosque.name,
          mosque_code: mosque.mosque_code,
          previous_amount: mosque.manual_donations || 0,
          new_amount: numAmount
        }
      })
    } catch (logError) {
      console.error('[Admin Manual Donation API] Failed to log activity:', logError)
      // Don't fail the request if logging fails
    }

    return successResponse({
      mosque_id: id,
      manual_donations: numAmount,
      message: 'Manual donation updated successfully'
    })
  } catch (error: any) {
    console.error('[Admin Manual Donation API] Error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

