import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getSupabaseAdmin, createActivityLog } from '@/lib/admin-helpers'

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
    const { status, reason } = body

    if (!status || !['active', 'rejected', 'inactive'].includes(status)) {
      return errorResponse('Invalid status. Must be active, rejected, or inactive', 400)
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get business details before update
    const { data: business, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('id, name, status, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !business) {
      return errorResponse('Business not found', 404)
    }

    // Update business status
    const { data: updatedBusiness, error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating business:', updateError)
      return errorResponse('Failed to update business status', 500)
    }

    // Create activity log
    const action = status === 'active' ? 'business_verified' : status === 'rejected' ? 'business_rejected' : 'business_deactivated'
    const actionDescription = status === 'active'
      ? `Verified business "${business.name}"`
      : status === 'rejected'
      ? `Rejected business "${business.name}"${reason ? `: ${reason}` : ''}`
      : `Deactivated business "${business.name}"${reason ? `: ${reason}` : ''}`

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await createActivityLog({
      adminId: authResult.user.id,
      action,
      actionDescription,
      entityType: 'business',
      entityId: id,
      entityName: business.name,
      metadata: {
        oldStatus: business.status,
        newStatus: status,
        reason: reason || null
      },
      ipAddress,
      userAgent
    })

    return successResponse({
      business: updatedBusiness,
      previousStatus: business.status,
      newStatus: status
    }, `Business ${status === 'active' ? 'verified' : status === 'rejected' ? 'rejected' : 'deactivated'} successfully`)
  } catch (error: any) {
    console.error('Verify business error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

