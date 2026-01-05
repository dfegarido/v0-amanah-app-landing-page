import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse } from '@/lib/api-helpers'

// Public endpoint - no auth required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const mosqueCode = searchParams.get('mosque_code') || ''
    const sortBy = searchParams.get('sort') || 'newest' // newest, ending_soon, popular
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Use service role to bypass RLS for public data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Build query
    let query = supabase
      .from('coupons')
      .select(`
        *,
        subscription:subscriptions!inner(
          user_id,
          app_status,
          status
        )
      `)
      .eq('status', 'active')
      .eq('subscription.app_status', 'active')
      .eq('subscription.status', 'active')
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0])

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,discount_details.ilike.%${search}%`)
    }

    if (mosqueCode) {
      query = query.eq('affiliated_mosque_code', parseInt(mosqueCode))
    }

    // Apply sorting
    switch (sortBy) {
      case 'ending_soon':
        query = query.order('end_date', { ascending: true })
        break
      case 'popular':
        query = query.order('redemption_count', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: coupons, error, count } = await query

    if (error) {
      console.error('[Coupons API] Error fetching coupons:', error)
      return errorResponse('Failed to fetch coupons', 500)
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0])

    return successResponse({
      coupons: coupons || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    })
  } catch (error: any) {
    console.error('[Coupons API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

