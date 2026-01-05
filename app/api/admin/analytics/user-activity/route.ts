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
    const period = searchParams.get('period') || 'day' // 'day', 'week', 'month'

    const supabaseAdmin = getSupabaseAdmin()

    // Build date filter
    const dateFilter = startDate && endDate 
      ? { gte: startDate, lte: endDate }
      : startDate 
      ? { gte: startDate }
      : endDate 
      ? { lte: endDate }
      : null

    // Get user registrations over time
    const usersQuery = supabaseAdmin
      .from('users')
      .select('created_at')
    
    if (dateFilter) {
      if (dateFilter.gte) usersQuery.gte('created_at', dateFilter.gte)
      if (dateFilter.lte) usersQuery.lte('created_at', dateFilter.lte)
    }
    
    const { data: users } = await usersQuery

    // Group by period
    const groupedUsers = groupByPeriod(users || [], period)

    // Get donations by users
    const donationsQuery = supabaseAdmin
      .from('donations')
      .select('user_id, created_at, amount, status')
    
    if (dateFilter) {
      if (dateFilter.gte) donationsQuery.gte('created_at', dateFilter.gte)
      if (dateFilter.lte) donationsQuery.lte('created_at', dateFilter.lte)
    }
    
    const { data: donations } = await donationsQuery

    const groupedDonations = groupByPeriod(donations || [], period)

    // Get businesses created by users
    const businessesQuery = supabaseAdmin
      .from('businesses')
      .select('user_id, created_at, status')
    
    if (dateFilter) {
      if (dateFilter.gte) businessesQuery.gte('created_at', dateFilter.gte)
      if (dateFilter.lte) businessesQuery.lte('created_at', dateFilter.lte)
    }
    
    const { data: businesses } = await businessesQuery

    const groupedBusinesses = groupByPeriod(businesses || [], period)

    // Get top active users (by donations, businesses, etc.)
    const activeUsers = await getActiveUsers(supabaseAdmin, dateFilter)

    return successResponse({
      registrations: groupedUsers,
      donations: groupedDonations,
      businesses: groupedBusinesses,
      activeUsers,
      period,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    })
  } catch (error: any) {
    console.error('Get user activity analytics error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

function groupByPeriod(data: any[], period: string): Record<string, number> {
  const grouped: Record<string, number> = {}

  data.forEach(item => {
    const date = new Date(item.created_at)
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

    grouped[key] = (grouped[key] || 0) + 1
  })

  return grouped
}

async function getActiveUsers(supabaseAdmin: any, dateFilter: any) {
  // Get users with most donations
  const { data: donationUsers } = await supabaseAdmin
    .from('donations')
    .select('user_id, amount')
    .not('user_id', 'is', null)

  const userDonationTotals: Record<string, { userId: string; donationCount: number; totalAmount: number }> = {}

  donationUsers?.forEach((donation: any) => {
    if (!donation.user_id) return
    if (!userDonationTotals[donation.user_id]) {
      userDonationTotals[donation.user_id] = {
        userId: donation.user_id,
        donationCount: 0,
        totalAmount: 0,
      }
    }
    userDonationTotals[donation.user_id].donationCount++
    userDonationTotals[donation.user_id].totalAmount += parseFloat(donation.amount.toString())
  })

  // Get user details
  const userIds = Object.keys(userDonationTotals)
  if (userIds.length === 0) return []

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, email')
    .in('id', userIds)

  return Object.values(userDonationTotals)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10)
    .map(item => {
      const user = users?.find((u: any) => u.id === item.userId)
      return {
        userId: item.userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        donationCount: item.donationCount,
        totalDonated: item.totalAmount,
      }
    })
}

