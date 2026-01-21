import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

/**
 * GET /api/community-funding
 * 
 * Calculates total funds returned to the Muslim community:
 * - 15% of all active subscription revenue (Amanah Org donation)
 * - 10% kickback from business/coupon subscriptions to mosques
 * - Manual donations from mosques table
 * - Additional donations from additional_donations table
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    // Get all active subscriptions with their price amounts
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('id, type, price_amount, status')
      .eq('status', 'active')

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    // Calculate total monthly subscription revenue
    const totalMonthlyRevenue = subscriptions?.reduce(
      (sum, sub) => sum + parseFloat(sub.price_amount.toString()),
      0
    ) || 0

    // 15% of all proceeds goes to Amanah Org (education/schools)
    const amanahOrgTotal = totalMonthlyRevenue * 0.15

    // 10% of business/coupon subscriptions goes to mosques via kickback
    const businessCouponSubscriptions = subscriptions?.filter(
      sub => sub.type === 'business' || sub.type === 'coupon'
    ) || []
    
    const mosqueKickbacks = businessCouponSubscriptions.reduce(
      (sum, sub) => sum + parseFloat(sub.price_amount.toString()) * 0.10,
      0
    )

    // Get manual donations from mosques table
    const { data: mosques, error: mosquesError } = await supabase
      .from('mosques')
      .select('manual_donations')

    if (mosquesError) {
      console.error('Error fetching mosques:', mosquesError)
    }

    const manualDonationsTotal = mosques?.reduce(
      (sum, mosque) => sum + parseFloat((mosque.manual_donations || 0).toString()),
      0
    ) || 0

    // Get additional donations
    const { data: additionalDonations, error: donationsError } = await supabase
      .from('additional_donations')
      .select('amount_per_month')

    if (donationsError) {
      console.error('Error fetching additional donations:', donationsError)
    }

    const additionalDonationsTotal = additionalDonations?.reduce(
      (sum, donation) => sum + parseFloat(donation.amount_per_month.toString()),
      0
    ) || 0

    // Calculate total given back to community
    const totalGivenBack = amanahOrgTotal + mosqueKickbacks + manualDonationsTotal + additionalDonationsTotal

    return NextResponse.json({
      success: true,
      data: {
        amanahOrgFund: Math.round(amanahOrgTotal * 100) / 100,
        mosqueKickbacks: Math.round(mosqueKickbacks * 100) / 100,
        manualDonations: Math.round(manualDonationsTotal * 100) / 100,
        additionalDonations: Math.round(additionalDonationsTotal * 100) / 100,
        totalGivenBack: Math.round(totalGivenBack * 100) / 100
      }
    })

  } catch (error) {
    console.error('Error calculating community funding:', error)
    return NextResponse.json(
      { error: 'Failed to calculate community funding' },
      { status: 500 }
    )
  }
}
