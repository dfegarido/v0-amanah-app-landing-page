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

    // Get mosque details before update
    const { data: mosque, error: fetchError } = await supabaseAdmin
      .from('mosques')
      .select('id, name, status, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !mosque) {
      return errorResponse('Mosque not found', 404)
    }

    // Update mosque status
    const { data: updatedMosque, error: updateError } = await supabaseAdmin
      .from('mosques')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating mosque:', updateError)
      return errorResponse('Failed to update mosque status', 500)
    }

    // Create activity log
    const action = status === 'active' ? 'mosque_verified' : status === 'rejected' ? 'mosque_rejected' : 'mosque_deactivated'
    const actionDescription = status === 'active'
      ? `Verified mosque "${mosque.name}"`
      : status === 'rejected'
      ? `Rejected mosque "${mosque.name}"${reason ? `: ${reason}` : ''}`
      : `Deactivated mosque "${mosque.name}"${reason ? `: ${reason}` : ''}`

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await createActivityLog({
      adminId: authResult.user.id,
      action,
      actionDescription,
      entityType: 'mosque',
      entityId: id,
      entityName: mosque.name,
      metadata: {
        oldStatus: mosque.status,
        newStatus: status,
        reason: reason || null
      },
      ipAddress,
      userAgent
    })

    return successResponse({
      mosque: updatedMosque,
      previousStatus: mosque.status,
      newStatus: status
    }, `Mosque ${status === 'active' ? 'verified' : status === 'rejected' ? 'rejected' : 'deactivated'} successfully`)
  } catch (error: any) {
    console.error('Verify mosque error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

