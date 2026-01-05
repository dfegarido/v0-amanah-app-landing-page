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

    // Get all donations
    const donationsQuery = supabaseAdmin
      .from('donations')
      .select('id, amount, status, currency, created_at, mosque_id, mosque_code, payment_provider')
    
    if (dateFilter) {
      if (dateFilter.gte) donationsQuery.gte('created_at', dateFilter.gte)
      if (dateFilter.lte) donationsQuery.lte('created_at', dateFilter.lte)
    }
    
    const { data: donations } = await donationsQuery

    // Group by status
    const byStatus = (donations || []).reduce((acc: Record<string, number>, donation: any) => {
      const status = donation.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    // Group by period
    const byPeriod: Record<string, { count: number; amount: number }> = {}
    ;(donations || []).forEach((donation: any) => {
      const date = new Date(donation.created_at)
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

      if (!byPeriod[key]) {
        byPeriod[key] = { count: 0, amount: 0 }
      }
      byPeriod[key].count++
      if (donation.status === 'succeeded') {
        byPeriod[key].amount += parseFloat(donation.amount.toString())
      }
    })

    // Group by payment provider
    const byProvider = (donations || []).reduce((acc: Record<string, { count: number; amount: number }>, donation: any) => {
      const provider = donation.payment_provider || 'unknown'
      if (!acc[provider]) {
        acc[provider] = { count: 0, amount: 0 }
      }
      acc[provider].count++
      if (donation.status === 'succeeded') {
        acc[provider].amount += parseFloat(donation.amount.toString())
      }
      return acc
    }, {})

    // Calculate totals
    const totalDonations = donations?.length || 0
    const succeededDonations = donations?.filter(d => d.status === 'succeeded') || []
    const totalAmount = succeededDonations.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0)
    const averageDonation = succeededDonations.length > 0 ? totalAmount / succeededDonations.length : 0

    return successResponse({
      summary: {
        totalDonations,
        totalAmount,
        averageDonation,
        succeededCount: succeededDonations.length,
      },
      byStatus,
      byPeriod,
      byProvider,
      period,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    })
  } catch (error: any) {
    console.error('Get donations analytics error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

