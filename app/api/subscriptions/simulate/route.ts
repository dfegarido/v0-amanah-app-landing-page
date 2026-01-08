import { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/auth'
import { successResponse, errorResponse, requireAuth, parseRequestBody } from '@/lib/api-helpers'

// Pricing configuration
const SUBSCRIPTION_PRICING = {
  mosque: 100.00,
  business: 10.00,
  coupon: 10.00,
  nonprofit: 50.00
}

interface SimulateSubscriptionRequest {
  type: 'mosque' | 'business' | 'coupon' | 'nonprofit'
  data: any
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body = await parseRequestBody<SimulateSubscriptionRequest>(request)
    if (!body || !body.type || !body.data) {
      return errorResponse('Missing required fields: type and data', 400)
    }

    const { type, data } = body
    const userId = authResult.user.id

    const supabase = getServerSupabase(request)

    // Get pricing for subscription type
    const priceAmount = SUBSCRIPTION_PRICING[type]
    if (!priceAmount) {
      return errorResponse('Invalid subscription type', 400)
    }

    // Calculate next billing date (1 month from now)
    const currentDate = new Date()
    const nextBillingDate = new Date(currentDate)
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    // Create subscription record in database (simulated - no Stripe)
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        type: type,
        status: 'active',
        app_status: 'pending_verification',
        stripe_subscription_id: `sim_sub_${Date.now()}`, // Simulated ID
        stripe_customer_id: `sim_cus_${userId.slice(0, 8)}`, // Simulated ID
        stripe_price_id: `sim_price_${type}`, // Simulated ID
        price_amount: priceAmount,
        currency: 'usd',
        current_period_start: currentDate.toISOString(),
        current_period_end: nextBillingDate.toISOString(),
        next_billing_date: nextBillingDate.toISOString()
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Database error creating subscription:', subscriptionError)
      return errorResponse('Failed to create subscription', 500)
    }

    // Create entity-specific record based on type
    let entityRecord: any
    let entityError: any

    switch (type) {
      case 'mosque':
        const { data: mosqueData, error: mosqueError } = await createMosqueRecord(
          supabase,
          subscription.id,
          userId,
          data
        )
        entityRecord = mosqueData
        entityError = mosqueError
        break

      case 'business':
        const { data: businessData, error: businessError } = await createBusinessRecord(
          supabase,
          subscription.id,
          userId,
          data
        )
        entityRecord = businessData
        entityError = businessError
        break

      case 'coupon':
        const { data: couponData, error: couponError } = await createCouponRecord(
          supabase,
          subscription.id,
          userId,
          data
        )
        entityRecord = couponData
        entityError = couponError
        break

      case 'nonprofit':
        const { data: nonprofitData, error: nonprofitError } = await createNonprofitRecord(
          supabase,
          subscription.id,
          userId,
          data
        )
        entityRecord = nonprofitData
        entityError = nonprofitError
        break
    }

    if (entityError) {
      console.error(`Error creating ${type} record:`, entityError)
      console.error('Data that was attempted to insert:', data)
      // Rollback: Delete subscription
      await supabase.from('subscriptions').delete().eq('id', subscription.id)
      return errorResponse(`Failed to create ${type} record: ${entityError.message || entityError.code || 'Unknown error'}`, 500)
    }

    return successResponse({
      subscription,
      entity: entityRecord
    }, 'Subscription created successfully')

  } catch (error: any) {
    console.error('Simulate subscription error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

// Helper function to create mosque record
async function createMosqueRecord(supabase: any, subscriptionId: string, userId: string, data: any) {
  // Get next mosque code
  const { data: mosqueCodeData } = await supabase.rpc('get_next_mosque_code')
  const mosqueCode = mosqueCodeData || 1

  // Build mosque record with only provided fields
  const mosqueRecord: any = {
    subscription_id: subscriptionId,
    user_id: userId,
    name: data.name,
    mosque_code: mosqueCode,
    address: data.address,
    phone: data.phone,
    email: data.email,
    status: 'pending'
  }

  // Add optional fields only if provided
  if (data.city) mosqueRecord.city = data.city
  if (data.state) mosqueRecord.state = data.state
  if (data.zip) mosqueRecord.zip = data.zip
  if (data.country) mosqueRecord.country = data.country
  if (data.website) mosqueRecord.website = data.website
  if (data.contactName) mosqueRecord.contact_name = data.contactName
  if (data.emergencyContactName) mosqueRecord.emergency_contact_name = data.emergencyContactName
  if (data.emergencyContactPhone) mosqueRecord.emergency_contact_phone = data.emergencyContactPhone
  if (data.logo) mosqueRecord.logo = data.logo
  if (data.photos && data.photos.length > 0) mosqueRecord.photos = data.photos
  if (data.donateLink) mosqueRecord.donate_link = data.donateLink
  if (data.prayerTimesLink) mosqueRecord.prayer_times_link = data.prayerTimesLink
  if (data.sundaySchool) mosqueRecord.sunday_school = data.sundaySchool
  if (data.services) mosqueRecord.services = data.services
  if (data.committee) mosqueRecord.committee_members = data.committee
  if (data.description) mosqueRecord.description = data.description

  // Handle social media if any is provided
  if (data.facebook || data.instagram || data.twitter || data.youtube || data.google || data.tiktok || data.otherSocial) {
    mosqueRecord.social_media = {
      facebook: data.facebook || null,
      instagram: data.instagram || null,
      twitter: data.twitter || null,
      youtube: data.youtube || null,
      google: data.google || null,
      tiktok: data.tiktok || null,
      other: data.otherSocial || null
    }
  }
  
  // Add individual social media fields if provided
  if (data.facebook) mosqueRecord.facebook = data.facebook
  if (data.instagram) mosqueRecord.instagram = data.instagram
  if (data.twitter) mosqueRecord.twitter = data.twitter
  if (data.youtube) mosqueRecord.youtube = data.youtube
  if (data.google) mosqueRecord.google = data.google
  if (data.tiktok) mosqueRecord.tiktok = data.tiktok
  if (data.otherSocial) mosqueRecord.other_social = data.otherSocial

  return await supabase
    .from('mosques')
    .insert(mosqueRecord)
    .select()
    .single()
}

// Helper function to create business record
async function createBusinessRecord(supabase: any, subscriptionId: string, userId: string, data: any) {
  const businessRecord: any = {
    subscription_id: subscriptionId,
    user_id: userId,
    name: data.title || data.name,
    status: 'pending'
  }

  // Add optional fields only if provided
  if (data.title) businessRecord.title = data.title // Business Name
  if (data.fax) businessRecord.fax = data.fax // Fax number
  if (data.description) businessRecord.description = data.description
  if (data.categories) businessRecord.categories = data.categories.split(',').map((c: string) => c.trim())
  if (data.subCategories) businessRecord.sub_categories = data.subCategories.split(',').map((c: string) => c.trim())
  if (data.address) businessRecord.address = data.address
  if (data.city) businessRecord.city = data.city
  if (data.state) businessRecord.state = data.state
  if (data.zip) businessRecord.zip = data.zip
  if (data.country) businessRecord.country = data.country
  if (data.phone) businessRecord.phone = data.phone
  if (data.email) businessRecord.email = data.email
  if (data.website) businessRecord.website = data.website
  if (data.contactName) businessRecord.contact_name = data.contactName
  if (data.contactPhone) businessRecord.contact_phone = data.contactPhone
  if (data.contactEmail) businessRecord.contact_email = data.contactEmail
  if (data.comments) businessRecord.comments = data.comments
  if (data.photos && data.photos.length > 0) businessRecord.photos = data.photos
  
  // Handle social media if any is provided
  if (data.facebook || data.instagram || data.twitter || data.youtube || data.linkedin || data.google || data.tiktok || data.otherSocial) {
    businessRecord.social_media = {
      facebook: data.facebook || null,
      instagram: data.instagram || null,
      twitter: data.twitter || null,
      youtube: data.youtube || null,
      linkedin: data.linkedin || null,
      google: data.google || null,
      tiktok: data.tiktok || null,
      other: data.otherSocial || null
    }
  }
  
  // Add individual social media fields if provided
  if (data.facebook) businessRecord.facebook = data.facebook
  if (data.instagram) businessRecord.instagram = data.instagram
  if (data.twitter) businessRecord.twitter = data.twitter
  if (data.youtube) businessRecord.youtube = data.youtube
  if (data.linkedin) businessRecord.linkedin = data.linkedin
  if (data.google) businessRecord.google = data.google
  if (data.tiktok) businessRecord.tiktok = data.tiktok
  if (data.otherSocial) businessRecord.other_social = data.otherSocial

  // Handle affiliated mosque code
  if (data.affiliatedMosqueCode && data.affiliatedMosqueCode !== 'none') {
    businessRecord.affiliated_mosque_code = parseInt(data.affiliatedMosqueCode)
  }

  // Handle donation fields
  if (data.donateToSameOrganization !== undefined) {
    businessRecord.donate_to_same_organization = data.donateToSameOrganization === true
  }
  if (data.donationAmount) {
    businessRecord.donation_amount = parseFloat(data.donationAmount)
  }
  if (data.donateToSameOrganization === true && 
      data.affiliatedMosqueCode && 
      data.affiliatedMosqueCode !== 'none') {
    businessRecord.donation_mosque_code = parseInt(data.affiliatedMosqueCode)
  }

  return await supabase
    .from('businesses')
    .insert(businessRecord)
    .select()
    .single()
}

// Helper function to create coupon record
async function createCouponRecord(supabase: any, subscriptionId: string, userId: string, data: any) {
  const couponRecord: any = {
    subscription_id: subscriptionId,
    user_id: userId,
    title: data.title,
    start_date: data.startDate || new Date().toISOString(),
    status: 'pending'
  }

  // Add optional fields only if provided
  if (data.merchant) couponRecord.merchant = data.merchant
  if (data.description) couponRecord.description = data.description
  if (data.thumbnailDescription) couponRecord.thumbnail_description = data.thumbnailDescription
  if (data.popUpText) couponRecord.pop_up_text = data.popUpText
  if (data.phone) couponRecord.phone = data.phone
  if (data.email) couponRecord.email = data.email
  if (data.website) couponRecord.website = data.website
  if (data.address) couponRecord.address = data.address
  if (data.redeemLimit) couponRecord.redeem_limit = parseInt(data.redeemLimit)
  if (data.userRedeemLimit) couponRecord.user_redeem_limit = parseInt(data.userRedeemLimit)
  if (data.userMonthlyLimit) couponRecord.user_monthly_redeem_limit = parseInt(data.userMonthlyLimit)
  if (data.userWeeklyLimit) couponRecord.user_weekly_redeem_limit = parseInt(data.userWeeklyLimit)
  if (data.discountAmount) couponRecord.discount_amount = data.discountAmount
  if (data.discountPercentage) couponRecord.discount_percentage = data.discountPercentage
  if (data.couponCode) couponRecord.coupon_code = data.couponCode
  if (data.redeemCode) couponRecord.redeem_code = data.redeemCode
  if (data.prefix) couponRecord.prefix = data.prefix
  if (data.nextNo) couponRecord.next_no = data.nextNo
  if (data.endDate) couponRecord.end_date = data.endDate
  if (data.photos && data.photos.length > 0) couponRecord.photos = data.photos

  // Handle affiliated mosque code
  if (data.affiliatedMosqueCode && data.affiliatedMosqueCode !== 'none') {
    couponRecord.affiliated_mosque_code = parseInt(data.affiliatedMosqueCode)
  }

  return await supabase
    .from('coupons')
    .insert(couponRecord)
    .select()
    .single()
}

// Helper function to create nonprofit record
async function createNonprofitRecord(supabase: any, subscriptionId: string, userId: string, data: any) {
  const nonprofitRecord: any = {
    subscription_id: subscriptionId,
    user_id: userId,
    name: data.orgName || data.name,
    about: data.about || 'No description provided',
    address: data.address || 'Address not provided',
    email: data.email,
    status: 'pending'
  }

  // Add optional fields only if provided
  if (data.phone) nonprofitRecord.phone = data.phone
  if (data.website) nonprofitRecord.website = data.website
  if (data.donateLink) nonprofitRecord.donate_link = data.donateLink
  if (data.logo) nonprofitRecord.logo = data.logo
  if (data.photos && data.photos.length > 0) nonprofitRecord.photos = data.photos
  
  // Handle social media if any is provided
  if (data.facebook || data.instagram || data.twitter || data.youtube || data.google || data.tiktok || data.otherSocial) {
    nonprofitRecord.social_media = {
      facebook: data.facebook || null,
      instagram: data.instagram || null,
      twitter: data.twitter || null,
      youtube: data.youtube || null,
      google: data.google || null,
      tiktok: data.tiktok || null,
      other: data.otherSocial || null
    }
  }
  
  // Add individual social media fields if provided
  if (data.facebook) nonprofitRecord.facebook = data.facebook
  if (data.instagram) nonprofitRecord.instagram = data.instagram
  if (data.twitter) nonprofitRecord.twitter = data.twitter
  if (data.youtube) nonprofitRecord.youtube = data.youtube
  if (data.google) nonprofitRecord.google = data.google
  if (data.tiktok) nonprofitRecord.tiktok = data.tiktok
  if (data.otherSocial) nonprofitRecord.other_social = data.otherSocial

  return await supabase
    .from('nonprofits')
    .insert(nonprofitRecord)
    .select()
    .single()
}
