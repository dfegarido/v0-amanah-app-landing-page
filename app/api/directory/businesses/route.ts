import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const mosqueCode = searchParams.get('mosque_code') || ''
    const status = searchParams.get('status') || 'active'

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('businesses')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (category) {
      query = query.contains('categories', [category])
    }

    if (mosqueCode) {
      query = query.eq('affiliated_mosque_code', parseInt(mosqueCode))
    }

    const { data: businesses, error, count } = await query

    if (error) {
      return errorResponse('Failed to fetch businesses', 500)
    }

    return successResponse({
      businesses: businesses || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Get businesses error:', error)
    return errorResponse('Internal server error', 500)
  }
}

