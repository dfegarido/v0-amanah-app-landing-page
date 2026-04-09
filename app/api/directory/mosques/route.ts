import { NextRequest, NextResponse } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[directory/mosques] SUPABASE_SERVICE_ROLE_KEY is not set')
      return errorResponse('Directory unavailable', 503)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const mosqueCode = searchParams.get('mosque_code') || ''
    const status = searchParams.get('status') || 'active'
    const includeAllStatuses = searchParams.get('include_all_statuses') === '1'
    const includeAllActive = searchParams.get('include_all_active') === '1'

    const offset = (page - 1) * limit

    const supabase = getSupabaseAdmin()

    // Default behavior keeps directory limited to "live" mosques (active + active subscription).
    // For member affiliation dropdowns:
    // - include_all_active=1 returns all active mosque entities
    // - include_all_statuses=1 returns all mosque entities regardless of status
    let query = includeAllActive
      ? supabase
          .from('mosques')
          .select('*', { count: 'exact' })
          .order('mosque_code', { ascending: true })
          .range(offset, offset + limit - 1)
      : supabase
          .from('mosques')
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
          .eq('subscription.type', 'mosque')
          .eq('status', status)
          .eq('subscription.app_status', 'active')
          .eq('subscription.status', 'active')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

    if (includeAllActive && !includeAllStatuses) {
      query = query.eq('status', status)
    }

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,address.ilike.%${search}%`)
    }

    if (mosqueCode) {
      query = query.eq('mosque_code', parseInt(mosqueCode))
    }

    const { data: mosques, error, count } = await query

    if (error) {
      return errorResponse('Failed to fetch mosques', 500)
    }

    return successResponse({
      mosques: mosques || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Get mosques error:', error)
    return errorResponse('Internal server error', 500)
  }
}
