import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/donations/[id] - Get donation details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const supabase = getServerSupabase(request)

    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .select(`
        *,
        mosque:mosques(id, name, mosque_code, address),
        user:users(id, name, email)
      `)
      .eq('id', params.id)
      .single()

    if (donationError || !donation) {
      return errorResponse('Donation not found', 404)
    }

    // Verify access (user owns donation or is admin)
    if (donation.user_id !== authResult.user.id && authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized', 403)
    }

    return successResponse(donation)
  } catch (error: any) {
    console.error('Get donation error:', error)
    return errorResponse('Internal server error', 500)
  }
}
