import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const period = searchParams.get('period') || 'day'

    const supabaseAdmin = getSupabaseAdmin()

    // Build date filter
    const dateFilter = startDate && endDate 
      ? { gte: startDate, lte: endDate }
      : startDate 
      ? { gte: startDate }
      : endDate 
      ? { lte: endDate }
      : null

    // Get businesses
    const businessesQuery = supabaseAdmin
      .from('businesses')
      .select('id, status, created_at, categories, affiliated_mosque_code')
    
    if (dateFilter) {
      if (dateFilter.gte) businessesQuery.gte('created_at', dateFilter.gte)
      if (dateFilter.lte) businessesQuery.lte('created_at', dateFilter.lte)
    }
    
    const { data: businesses } = await businessesQuery

    // Get mosques
    const mosquesQuery = supabaseAdmin
      .from('mosques')
      .select('id, status, created_at, mosque_code')
    
    if (dateFilter) {
      if (dateFilter.gte) mosquesQuery.gte('created_at', dateFilter.gte)
      if (dateFilter.lte) mosquesQuery.lte('created_at', dateFilter.lte)
    }
    
    const { data: mosques } = await mosquesQuery

    // Get subscriptions
    const subscriptionsQuery = supabaseAdmin
      .from('subscriptions')
      .select('id, type, status, created_at')
    
    if (dateFilter) {
      if (dateFilter.gte) subscriptionsQuery.gte('created_at', dateFilter.gte)
      if (dateFilter.lte) subscriptionsQuery.lte('created_at', dateFilter.lte)
    }
    
    const { data: subscriptions } = await subscriptionsQuery

    // Group businesses by period
    const businessesByPeriod: Record<string, { total: number; active: number; pending: number }> = {}
    ;(businesses || []).forEach((business: any) => {
      const date = new Date(business.created_at)
      let key = ''

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!businessesByPeriod[key]) {
        businessesByPeriod[key] = { total: 0, active: 0, pending: 0 }
      }
      businessesByPeriod[key].total++
      if (business.status === 'active') businessesByPeriod[key].active++
      if (business.status === 'pending') businessesByPeriod[key].pending++
    })

    // Group mosques by period
    const mosquesByPeriod: Record<string, { total: number; active: number; pending: number }> = {}
    ;(mosques || []).forEach((mosque: any) => {
      const date = new Date(mosque.created_at)
      let key = ''

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!mosquesByPeriod[key]) {
        mosquesByPeriod[key] = { total: 0, active: 0, pending: 0 }
      }
      mosquesByPeriod[key].total++
      if (mosque.status === 'active') mosquesByPeriod[key].active++
      if (mosque.status === 'pending') mosquesByPeriod[key].pending++
    })

    // Group by category (businesses)
    const businessesByCategory: Record<string, number> = {}
    ;(businesses || []).forEach((business: any) => {
      if (business.categories && Array.isArray(business.categories)) {
        business.categories.forEach((category: string) => {
          businessesByCategory[category] = (businessesByCategory[category] || 0) + 1
        })
      }
    })

    // Group subscriptions by type
    const subscriptionsByType: Record<string, number> = {}
    ;(subscriptions || []).forEach((sub: any) => {
      const type = sub.type || 'unknown'
      subscriptionsByType[type] = (subscriptionsByType[type] || 0) + 1
    })

    // Status breakdown
    const businessesByStatus = (businesses || []).reduce((acc: Record<string, number>, business: any) => {
      const status = business.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const mosquesByStatus = (mosques || []).reduce((acc: Record<string, number>, mosque: any) => {
      const status = mosque.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    return successResponse({
      businesses: {
        total: businesses?.length || 0,
        byStatus: businessesByStatus,
        byPeriod: businessesByPeriod,
        byCategory: businessesByCategory,
      },
      mosques: {
        total: mosques?.length || 0,
        byStatus: mosquesByStatus,
        byPeriod: mosquesByPeriod,
      },
      subscriptions: {
        total: subscriptions?.length || 0,
        byType: subscriptionsByType,
      },
      period,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    })
  } catch (error: any) {
    console.error('Get listings analytics error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

