import { NextRequest, NextResponse } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[directory/nonprofits] SUPABASE_SERVICE_ROLE_KEY is not set')
      return errorResponse('Directory unavailable', 503)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'active'

    const offset = (page - 1) * limit

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('nonprofits')
      .select(
        `*,
        subscription:subscriptions!inner(
          id,
          type,
          app_status,
          status
        )`,
        { count: 'exact' }
      )
      .eq('subscription.type', 'nonprofit')
      .eq('status', status)
      .eq('subscription.app_status', 'active')
      .eq('subscription.status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,about.ilike.%${search}%,address.ilike.%${search}%`)
    }

    const { data: nonprofits, error, count } = await query

    if (error) {
      console.error('Get nonprofits error:', error)
      return errorResponse('Failed to fetch nonprofits', 500)
    }

    return successResponse({
      nonprofits: nonprofits || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Get nonprofits error:', error)
    return errorResponse('Internal server error', 500)
  }
}

