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

    const offset = (page - 1) * limit

    const supabase = getSupabaseAdmin()

    // Service role + live subscription filter (same idea as public coupons API).
    // Anon client RLS in server routes was unreliable for directory-shaped reads.
    let query = supabase
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
