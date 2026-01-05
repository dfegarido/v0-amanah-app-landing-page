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

    const supabaseAdmin = getSupabaseAdmin()

    // Build date filter
    const dateFilter = startDate && endDate 
      ? { gte: startDate, lte: endDate }
      : startDate 
      ? { gte: startDate }
      : endDate 
      ? { lte: endDate }
      : null

    // Get user statistics
    const usersQuery = supabaseAdmin
      .from('users')
      .select('id, created_at, role', { count: 'exact', head: false })
    
    if (dateFilter) {
      if (dateFilter.gte) usersQuery.gte('created_at', dateFilter.gte)
      if (dateFilter.lte) usersQuery.lte('created_at', dateFilter.lte)
    }
    
    const { count: totalUsers } = await usersQuery

    // Get donations statistics
    const donationsQuery = supabaseAdmin
      .from('donations')
      .select('id, amount, status, created_at', { count: 'exact', head: false })
    
    if (dateFilter) {
      if (dateFilter.gte) donationsQuery.gte('created_at', dateFilter.gte)
      if (dateFilter.lte) donationsQuery.lte('created_at', dateFilter.lte)
    }
    
    const { data: donations, count: totalDonations } = await donationsQuery

    const totalDonationAmount = donations?.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0) || 0
    const succeededDonations = donations?.filter(d => d.status === 'succeeded') || []
    const succeededAmount = succeededDonations.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0)
    const pendingDonations = donations?.filter(d => d.status === 'pending' || d.status === 'processing') || []

    // Get businesses statistics
    // Note: We get ALL businesses first, then filter by date for "new" count
    const { data: allBusinesses } = await supabaseAdmin
      .from('businesses')
      .select('id, status, created_at')
    
    // Filter businesses created within date range
    const businessesInRange = allBusinesses?.filter(b => {
      if (!dateFilter) return true
      const createdAt = new Date(b.created_at)
      const start = dateFilter.gte ? new Date(dateFilter.gte) : null
      const end = dateFilter.lte ? new Date(dateFilter.lte) : null
      if (start && createdAt < start) return false
      if (end && createdAt > end) return false
      return true
    }) || []

    // Currently active businesses (regardless of date range)
    const activeBusinesses = allBusinesses?.filter(b => b.status === 'active') || []
    const pendingBusinesses = allBusinesses?.filter(b => b.status === 'pending') || []
    
    // New businesses created in date range
    const newBusinessesInRange = businessesInRange.filter(b => b.status === 'active' || b.status === 'pending')
    const totalBusinesses = businessesInRange.length

    // Get mosques statistics
    // Note: We get ALL mosques first, then filter by date for "new" count
    const { data: allMosques } = await supabaseAdmin
      .from('mosques')
      .select('id, status, created_at')
    
    // Filter mosques created within date range
    const mosquesInRange = allMosques?.filter(m => {
      if (!dateFilter) return true
      const createdAt = new Date(m.created_at)
      const start = dateFilter.gte ? new Date(dateFilter.gte) : null
      const end = dateFilter.lte ? new Date(dateFilter.lte) : null
      if (start && createdAt < start) return false
      if (end && createdAt > end) return false
      return true
    }) || []

    // Currently active mosques (regardless of date range)
    const activeMosques = allMosques?.filter(m => m.status === 'active') || []
    const pendingMosques = allMosques?.filter(m => m.status === 'pending') || []
    
    // New mosques created in date range
    const newMosquesInRange = mosquesInRange.filter(m => m.status === 'active' || m.status === 'pending')
    const totalMosques = mosquesInRange.length

    // Get subscriptions statistics
    const subscriptionsQuery = supabaseAdmin
      .from('subscriptions')
      .select('id, status, type, created_at', { count: 'exact', head: false })
    
    if (dateFilter) {
      if (dateFilter.gte) subscriptionsQuery.gte('created_at', dateFilter.gte)
      if (dateFilter.lte) subscriptionsQuery.lte('created_at', dateFilter.lte)
    }
    
    const { data: subscriptions, count: totalSubscriptions } = await subscriptionsQuery

    const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || []

    return successResponse({
      overview: {
        users: {
          total: totalUsers || 0, // Users created in date range
        },
        donations: {
          total: totalDonations || 0, // Donations made in date range
          totalAmount: totalDonationAmount,
          succeededCount: succeededDonations.length,
          succeededAmount,
          pendingCount: pendingDonations.length,
        },
        businesses: {
          total: totalBusinesses || 0, // Businesses created in date range
          active: activeBusinesses.length, // Currently active (all time)
          pending: pendingBusinesses.length, // Currently pending (all time)
          newInRange: newBusinessesInRange.length, // New in date range
        },
        mosques: {
          total: totalMosques || 0, // Mosques created in date range
          active: activeMosques.length, // Currently active (all time)
          pending: pendingMosques.length, // Currently pending (all time)
          newInRange: newMosquesInRange.length, // New in date range
        },
        subscriptions: {
          total: totalSubscriptions || 0, // Subscriptions created in date range
          active: activeSubscriptions.length, // Active in date range
        },
      },
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    })
  } catch (error: any) {
    console.error('Get analytics overview error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

