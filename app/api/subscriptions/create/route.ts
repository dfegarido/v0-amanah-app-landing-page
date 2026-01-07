import { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/auth'
import { successResponse, errorResponse, requireAuth, parseRequestBody } from '@/lib/api-helpers'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

// Service role Supabase client for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Default pricing configuration (fallback if no settings in database)
const DEFAULT_SUBSCRIPTION_PRICING = {
  mosque: { amount: 10000, currency: 'usd' }, // $100/month
  business: { amount: 1000, currency: 'usd' }, // $10/month
  coupon: { amount: 1000, currency: 'usd' }, // $10/month
  nonprofit: { amount: 5000, currency: 'usd' } // $50/month
}

// Fetch pricing from admin settings (uses service role to bypass RLS)
async function getSubscriptionPricing(type: 'mosque' | 'business' | 'coupon' | 'nonprofit') {
  try {
    console.log('[Pricing] Fetching pricing from admin_settings for type:', type)
    const { data: settings, error: fetchError } = await supabaseAdmin
      .from('admin_settings')
      .select('pricing_mosque, pricing_business, pricing_coupon, pricing_nonprofit')
      .single()

    if (fetchError) {
      console.error('[Pricing] Error fetching admin_settings:', fetchError)
      console.log('[Pricing] Falling back to default pricing')
      return DEFAULT_SUBSCRIPTION_PRICING[type]
    }

    console.log('[Pricing] Admin settings fetched:', JSON.stringify(settings, null, 2))

    if (settings) {
      const pricingMap: Record<string, number> = {
        mosque: settings.pricing_mosque || DEFAULT_SUBSCRIPTION_PRICING.mosque.amount,
        business: settings.pricing_business || DEFAULT_SUBSCRIPTION_PRICING.business.amount,
        coupon: settings.pricing_coupon || DEFAULT_SUBSCRIPTION_PRICING.coupon.amount,
        nonprofit: settings.pricing_nonprofit || DEFAULT_SUBSCRIPTION_PRICING.nonprofit.amount
      }

      console.log('[Pricing] Pricing map:', pricingMap)
      console.log('[Pricing] Selected pricing for', type, ':', pricingMap[type], 'cents ($' + (pricingMap[type] / 100) + ')')

      return { amount: pricingMap[type], currency: 'usd' }
    }
  } catch (error) {
    console.error('[Pricing] Exception fetching pricing from settings:', error)
  }

  // Fallback to default pricing
  console.log('[Pricing] Using fallback default pricing for', type)
  return DEFAULT_SUBSCRIPTION_PRICING[type]
}

interface CreateSubscriptionRequest {
  type: 'mosque' | 'business' | 'coupon' | 'nonprofit'
  data: any // Form data specific to each type
  paymentMethodId?: string // If using existing payment method
}

export async function POST(request: NextRequest) {
  try {
    // Verify Stripe key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Stripe] STRIPE_SECRET_KEY is not configured')
      return errorResponse('Stripe configuration error. Please contact support.', 500)
    }

    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body = await parseRequestBody<CreateSubscriptionRequest>(request)
    if (!body || !body.type || !body.data) {
      return errorResponse('Missing required fields: type and data', 400)
    }

    const { type, data, paymentMethodId } = body
    const userId = authResult.user.id

    console.log(`[Subscription Create] Type: ${type}, User: ${userId}`)
    console.log(`[Subscription Create] Data:`, JSON.stringify(data, null, 2))

    const supabase = getServerSupabase(request)

    // Get or create Stripe customer
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, email, name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('[Subscription Create] User not found:', userError)
      return errorResponse('User not found', 404)
    }

    let customerId = user.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      console.log('[Stripe] Creating new customer for:', user.email)
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: {
            user_id: userId
          }
        })
        customerId = customer.id
        console.log('[Stripe] Customer created:', customerId)

        // Update user with Stripe customer ID
        await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId)
      } catch (stripeError: any) {
        console.error('[Stripe] Customer creation failed:', stripeError.message)
        console.error('[Stripe] Error details:', stripeError)
        return errorResponse(`Stripe error: ${stripeError.message}`, 500)
      }
    }

    // Get pricing for subscription type from admin settings
    let pricing = await getSubscriptionPricing(type)
    if (!pricing) {
      return errorResponse('Invalid subscription type', 400)
    }
    
    // For coupons, check if custom price is provided in the data
    if (type === 'coupon' && data.customPrice) {
      const customPriceInCents = Math.round(parseFloat(data.customPrice) * 100)
      if (!isNaN(customPriceInCents) && customPriceInCents > 0) {
        console.log(`[Pricing] Using custom coupon price: $${data.customPrice} (${customPriceInCents} cents)`)
        pricing = { amount: customPriceInCents, currency: 'usd' }
      }
    }
    
    // For business subscriptions, add donation amount to the total if applicable
    if (type === 'business' && data.donateToSameOrganization === true && data.donationAmount) {
      const donationAmount = parseFloat(data.donationAmount)
      if (!isNaN(donationAmount) && donationAmount > 0) {
        const donationInCents = Math.round(donationAmount * 100)
        pricing.amount = pricing.amount + donationInCents
        console.log(`[Pricing] Adding donation amount: $${donationAmount} (${donationInCents} cents)`)
        console.log(`[Pricing] Total with donation: $${pricing.amount / 100}`)
      }
    }
    
    console.log(`[Pricing] Using ${type} pricing: $${pricing.amount / 100}`)

    // Create a new Stripe price for this subscription
    // Always create new prices to ensure they match current admin pricing
    let stripePriceId: string
    
    console.log(`[Stripe] Creating new price for ${type} at $${pricing.amount / 100}`)
    try {
      const price = await stripe.prices.create({
        currency: pricing.currency,
        unit_amount: pricing.amount,
        recurring: {
          interval: 'month'
        },
        product_data: {
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Subscription`
        }
      })
      stripePriceId = price.id
      console.log(`[Stripe] Price created: ${stripePriceId} for $${pricing.amount / 100}`)
    } catch (stripeError: any) {
      console.error('[Stripe] Price creation failed:', stripeError.message)
      console.error('[Stripe] Error details:', stripeError)
      return errorResponse(`Stripe error: ${stripeError.message}`, 500)
    }

    // Attach payment method if provided
    if (paymentMethodId) {
      console.log(`[Stripe] Attaching payment method: ${paymentMethodId}`)
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId
        })

        // Set as default payment method
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        })
        console.log('[Stripe] Payment method attached successfully')
      } catch (stripeError: any) {
        console.error('[Stripe] Payment method attach failed:', stripeError.message)
        console.error('[Stripe] Error details:', stripeError)
        return errorResponse(`Stripe error: ${stripeError.message}`, 500)
      }
    }

    // Create Stripe subscription
    console.log(`[Stripe] Creating subscription for customer: ${customerId}`)
    let stripeSubscription: Stripe.Subscription
    try {
      stripeSubscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: stripePriceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          user_id: userId,
          subscription_type: type
        }
      })
      console.log(`[Stripe] Subscription created: ${stripeSubscription.id}`)
    } catch (stripeError: any) {
      console.error('[Stripe] Subscription creation failed:', stripeError.message)
      console.error('[Stripe] Error details:', stripeError)
      return errorResponse(`Stripe error: ${stripeError.message}`, 500)
    }

    // Create subscription record in database
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        type: type,
        status: 'active',
        app_status: 'pending_verification',
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: customerId,
        stripe_price_id: stripePriceId,
        price_amount: pricing.amount / 100, // Convert cents to dollars
        currency: pricing.currency,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        next_billing_date: new Date(stripeSubscription.current_period_end * 1000).toISOString()
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Database error creating subscription:', subscriptionError)
      // Rollback: Cancel Stripe subscription
      await stripe.subscriptions.cancel(stripeSubscription.id)
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
      console.error(`Error details:`, JSON.stringify(entityError, null, 2))
      console.error(`Data sent:`, JSON.stringify(data, null, 2))
      // Rollback: Delete subscription and cancel Stripe subscription
      await supabase.from('subscriptions').delete().eq('id', subscription.id)
      await stripe.subscriptions.cancel(stripeSubscription.id)
      return errorResponse(`Failed to create ${type} record: ${entityError.message || entityError.details || 'Unknown error'}`, 500)
    }

    // Get payment intent client secret if needed
    const latestInvoice: any = stripeSubscription.latest_invoice
    const clientSecret = latestInvoice?.payment_intent?.client_secret

    return successResponse({
      subscription,
      entity: entityRecord,
      clientSecret, // For completing payment on frontend if needed
      requiresAction: stripeSubscription.status === 'incomplete'
    }, 'Subscription created successfully')

  } catch (error: any) {
    console.error('Create subscription error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

// Helper function to create mosque record
async function createMosqueRecord(supabase: any, subscriptionId: string, userId: string, data: any) {
  // Get next mosque code
  const { data: mosqueCodeData } = await supabase.rpc('get_next_mosque_code')
  const mosqueCode = mosqueCodeData || 1

  return await supabase
    .from('mosques')
    .insert({
      subscription_id: subscriptionId,
      user_id: userId,
      name: data.name,
      mosque_code: mosqueCode,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country || 'USA',
      phone: data.phone,
      email: data.email,
      website: data.website,
      contact_name: data.contactName,
      emergency_contact_name: data.emergencyContactName,
      emergency_contact_phone: data.emergencyContactPhone,
      social_media: {
        facebook: data.facebook,
        instagram: data.instagram,
        twitter: data.twitter,
        youtube: data.youtube,
        google: data.google,
        tiktok: data.tiktok,
        other: data.otherSocial
      },
      facebook: data.facebook,
      instagram: data.instagram,
      twitter: data.twitter,
      youtube: data.youtube,
      google: data.google,
      tiktok: data.tiktok,
      other_social: data.otherSocial,
      logo: data.logo,
      photos: data.photos || [],
      donate_link: data.donateLink,
      prayer_times_link: data.prayerTimesLink,
      sunday_school: data.sundaySchool,
      sunday_school_link: data.sundaySchoolLink,
      services: data.services,
      committee_members: data.committee,
      description: data.description,
      status: 'pending'
    })
    .select()
    .single()
}

// Helper function to create business record
async function createBusinessRecord(supabase: any, subscriptionId: string, userId: string, data: any) {
  return await supabase
    .from('businesses')
    .insert({
      subscription_id: subscriptionId,
      user_id: userId,
      name: data.title || data.name,
      description: data.description,
      categories: data.categories ? data.categories.split(',').map((c: string) => c.trim()) : [],
      sub_categories: data.subCategories ? data.subCategories.split(',').map((c: string) => c.trim()) : [],
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country || 'USA',
      phone: data.phone,
      email: data.email,
      website: data.website,
      contact_name: data.contactName,
      contact_phone: data.contactPhone,
      contact_email: data.contactEmail,
      social_media: {
        facebook: data.facebook,
        instagram: data.instagram,
        twitter: data.twitter,
        youtube: data.youtube,
        linkedin: data.linkedin,
        tiktok: data.tiktok,
        google: data.google,
        other: data.otherSocial
      },
      comments: data.comments,
      photos: data.photos || [],
      affiliated_mosque_code: data.affiliatedMosqueCode && data.affiliatedMosqueCode !== 'none' 
        ? parseInt(data.affiliatedMosqueCode) 
        : null,
      donate_to_same_organization: data.donateToSameOrganization === true,
      donation_amount: data.donationAmount ? parseFloat(data.donationAmount) : null,
      donation_mosque_code: data.donateToSameOrganization === true && 
                           data.affiliatedMosqueCode && 
                           data.affiliatedMosqueCode !== 'none'
        ? parseInt(data.affiliatedMosqueCode)
        : null,
      status: 'pending'
    })
    .select()
    .single()
}

// Helper function to create coupon record
async function createCouponRecord(supabase: any, subscriptionId: string, userId: string, data: any) {
  console.log('createCouponRecord - Raw input data:', JSON.stringify(data, null, 2))
  console.log('createCouponRecord - Address value:', data.address, 'Type:', typeof data.address)
  
  // Format date to YYYY-MM-DD if it's a Date object or ISO string
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return new Date().toISOString().split('T')[0]
    if (typeof dateValue === 'string') {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue
      // Otherwise, try to parse and format
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return dateValue.toISOString().split('T')[0]
    }
    // Fallback to today
    return new Date().toISOString().split('T')[0]
  }

  // Helper to safely get string value with fallback
  const getRequiredString = (value: any, fallback: string): string => {
    if (value === null || value === undefined) return fallback
    const trimmed = String(value).trim()
    return trimmed || fallback
  }

  // Ensure all required fields have values
  const couponData: any = {
    subscription_id: subscriptionId,
    user_id: userId,
    title: getRequiredString(data.title, 'Untitled Coupon'),
    merchant: getRequiredString(data.merchant, 'Unknown Merchant'),
    description: getRequiredString(data.description, 'No description provided'),
    phone: getRequiredString(data.phone, 'N/A'),
    email: getRequiredString(data.email, 'N/A'),
    address: getRequiredString(data.address, 'N/A'),
    start_date: formatDate(data.startDate),
    status: 'pending'
  }
  
  console.log('Coupon data after processing:', JSON.stringify(couponData, null, 2))

  // Add optional fields
  if (data.thumbnailDescription && data.thumbnailDescription.trim()) {
    couponData.thumbnail_description = data.thumbnailDescription.trim()
  }
  if (data.popUpText && data.popUpText.trim()) {
    couponData.pop_up_text = data.popUpText.trim()
  }
  if (data.website && data.website.trim()) {
    couponData.website = data.website.trim()
  }
  if (data.redeemLimit) {
    const limit = parseInt(data.redeemLimit.toString())
    if (!isNaN(limit)) couponData.redeem_limit = limit
  }
  if (data.userRedeemLimit) {
    const limit = parseInt(data.userRedeemLimit.toString())
    if (!isNaN(limit)) couponData.user_redeem_limit = limit
  }
  if (data.userMonthlyLimit) {
    const limit = parseInt(data.userMonthlyLimit.toString())
    if (!isNaN(limit)) couponData.user_monthly_redeem_limit = limit
  }
  if (data.userWeeklyLimit) {
    const limit = parseInt(data.userWeeklyLimit.toString())
    if (!isNaN(limit)) couponData.user_weekly_redeem_limit = limit
  }
  if (data.discountAmount && data.discountAmount.toString().trim()) {
    couponData.discount_amount = data.discountAmount.toString().trim()
  }
  if (data.discountPercentage && data.discountPercentage.toString().trim()) {
    couponData.discount_percentage = data.discountPercentage.toString().trim()
  }
  if (data.couponCode && data.couponCode.trim()) {
    couponData.coupon_code = data.couponCode.trim()
  }
  if (data.redeemCode && data.redeemCode.trim()) {
    couponData.redeem_code = data.redeemCode.trim()
  }
  if (data.prefix && data.prefix.trim()) {
    couponData.prefix = data.prefix.trim()
  }
  if (data.nextNo && data.nextNo.toString().trim()) {
    couponData.next_no = data.nextNo.toString().trim()
  }
  if (data.endDate) {
    couponData.end_date = formatDate(data.endDate)
  }
  if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
    couponData.photos = data.photos.filter((p: any) => p && typeof p === 'string')
  }
  if (data.affiliatedMosqueCode && data.affiliatedMosqueCode !== 'none') {
    const mosqueCode = parseInt(data.affiliatedMosqueCode.toString())
    if (!isNaN(mosqueCode)) {
      couponData.affiliated_mosque_code = mosqueCode
    }
  }

  console.log('Creating coupon with data:', JSON.stringify(couponData, null, 2))

  const { data: result, error } = await supabase
    .from('coupons')
    .insert(couponData)
    .select()
    .single()

  if (error) {
    console.error('Coupon insert error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)
    console.error('Error hint:', error.hint)
  }

  return { data: result, error }
}

// Helper function to create nonprofit record
async function createNonprofitRecord(supabase: any, subscriptionId: string, userId: string, data: any) {
  // Handle mosque affiliation
  let mosqueCode = null
  if (data.affiliatedMosqueCode && data.affiliatedMosqueCode !== 'none') {
    mosqueCode = parseInt(data.affiliatedMosqueCode)
  }

  return await supabase
    .from('nonprofits')
    .insert({
      subscription_id: subscriptionId,
      user_id: userId,
      name: data.orgName || data.name,
      description: data.description || data.about || 'No description provided',
      about: data.about || data.description || 'No description provided', // Required field - provide fallback
      address: data.address || 'Address not provided', // Required field - provide fallback
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country || 'USA',
      email: data.email,
      phone: data.phone || 'Not provided', // Required field - provide fallback
      website: data.website,
      contact_name: data.contactName,
      donate_link: data.donateLink,
      programs_link: data.programsLink,
      social_media: {
        facebook: data.facebook,
        instagram: data.instagram,
        twitter: data.twitter,
        youtube: data.youtube,
        google: data.google,
        tiktok: data.tiktok,
        other: data.otherSocial
      },
      facebook: data.facebook,
      instagram: data.instagram,
      twitter: data.twitter,
      youtube: data.youtube,
      google: data.google,
      tiktok: data.tiktok,
      other_social: data.otherSocial,
      services: data.services,
      committee_members: data.committee,
      logo: data.logo,
      photos: data.photos || [],
      affiliated_mosque_code: mosqueCode,
      status: 'pending'
    })
    .select()
    .single()
}
