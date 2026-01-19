import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

/**
 * GET /api/amanah-us/impact
 * 
 * Fetches impact metrics for Amanah Us nonprofit page:
 * - Total amount donated (15% of all active subscriptions)
 * - Number of mosques supported
 * - Number of nonprofits funded
 * - Number of schools helped
 * - Total active subscriptions
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

    // Get all additional donations
    const { data: additionalDonations, error: donationsError } = await supabase
      .from('additional_donations')
      .select('subscription_id, organization_type, amount_per_month')

    if (donationsError) {
      console.error('Error fetching additional donations:', donationsError)
    }

    // Calculate total monthly subscription revenue
    const totalMonthlyRevenue = subscriptions?.reduce(
      (sum, sub) => sum + parseFloat(sub.price_amount.toString()),
      0
    ) || 0

    // Calculate total additional donations going to mosques and nonprofits
    const totalAdditionalDonations = additionalDonations?.reduce(
      (sum, donation) => sum + parseFloat(donation.amount_per_month.toString()),
      0
    ) || 0

    // 15% of all proceeds goes to Amanah Us (education/schools)
    const amanahUsShare = totalMonthlyRevenue * 0.15

    // 10% of business/coupon subscriptions goes to mosques via kickback
    // Plus additional donations to mosques
    const businessCouponSubscriptions = subscriptions?.filter(
      sub => sub.type === 'business' || sub.type === 'coupon'
    ) || []
    
    const mosqueKickbacks = businessCouponSubscriptions.reduce(
      (sum, sub) => sum + parseFloat(sub.price_amount.toString()) * 0.10,
      0
    )

    const additionalMosqueDonations = additionalDonations?.filter(
      d => d.organization_type === 'mosque'
    ).reduce((sum, d) => sum + parseFloat(d.amount_per_month.toString()), 0) || 0

    const totalMosqueFunding = mosqueKickbacks + additionalMosqueDonations

    // Additional donations to nonprofits
    const additionalNonprofitDonations = additionalDonations?.filter(
      d => d.organization_type === 'nonprofit'
    ).reduce((sum, d) => sum + parseFloat(d.amount_per_month.toString()), 0) || 0

    // Get unique mosques being supported (via subscription affiliation + additional donations)
    const { data: businesses } = await supabase
      .from('businesses')
      .select('affiliated_mosque_code')
      .not('affiliated_mosque_code', 'is', null)

    const { data: coupons } = await supabase
      .from('coupons')
      .select('affiliated_mosque_code')
      .not('affiliated_mosque_code', 'is', null)

    const uniqueMosqueCodes = new Set([
      ...(businesses?.map(b => b.affiliated_mosque_code) || []),
      ...(coupons?.map(c => c.affiliated_mosque_code) || [])
    ])

    // Add mosques from additional donations
    const mosqueDonationIds = additionalDonations?.filter(
      d => d.organization_type === 'mosque'
    ).map(d => d.organization_id) || []

    const { data: mosquesFromDonations } = await supabase
      .from('mosques')
      .select('mosque_code')
      .in('id', mosqueDonationIds)

    mosquesFromDonations?.forEach(m => uniqueMosqueCodes.add(m.mosque_code))

    // Get unique nonprofits being funded (via additional donations)
    const uniqueNonprofitIds = new Set(
      additionalDonations?.filter(d => d.organization_type === 'nonprofit')
        .map(d => d.organization_id) || []
    )

    // Count mosque subscriptions (these are schools/organizations on the platform)
    const mosqueSubscriptions = subscriptions?.filter(sub => sub.type === 'mosque') || []
    const numberOfSchools = mosqueSubscriptions.length

    // Calculate total amount donated (monthly)
    const totalDonatedMonthly = amanahUsShare + totalMosqueFunding + additionalNonprofitDonations

    // For annual estimate, multiply by 12
    const totalDonatedAnnually = totalDonatedMonthly * 12

    return NextResponse.json({
      success: true,
      data: {
        // Main metrics
        totalDonated: {
          monthly: Math.round(totalDonatedMonthly * 100) / 100,
          annually: Math.round(totalDonatedAnnually * 100) / 100
        },
        mosquesSupported: uniqueMosqueCodes.size,
        nonprofitsFunded: uniqueNonprofitIds.size,
        schoolsHelped: numberOfSchools,
        totalSubscriptions: subscriptions?.length || 0,
        
        // Breakdown
        breakdown: {
          amanahUsEducation: Math.round(amanahUsShare * 100) / 100, // 15% to schools
          mosqueSupport: Math.round(totalMosqueFunding * 100) / 100, // 10% kickback + donations
          nonprofitSupport: Math.round(additionalNonprofitDonations * 100) / 100
        }
      }
    })

  } catch (error) {
    console.error('Error fetching impact metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch impact metrics' },
      { status: 500 }
    )
  }
}
