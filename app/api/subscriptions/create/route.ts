import { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/auth'
import { successResponse, errorResponse, requireAuth, parseRequestBody } from '@/lib/api-helpers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

// Pricing configuration
const SUBSCRIPTION_PRICING = {
  mosque: { amount: 10000, currency: 'usd' }, // $100/month
  business: { amount: 1000, currency: 'usd' }, // $10/month
  coupon: { amount: 1000, currency: 'usd' }, // $10/month
  nonprofit: { amount: 5000, currency: 'usd' } // $50/month
}

interface CreateSubscriptionRequest {
  type: 'mosque' | 'business' | 'coupon' | 'nonprofit'
  data: any // Form data specific to each type
  paymentMethodId?: string // If using existing payment method
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body = await parseRequestBody<CreateSubscriptionRequest>(request)
    if (!body || !body.type || !body.data) {
      return errorResponse('Missing required fields: type and data', 400)
    }

    const { type, data, paymentMethodId } = body
    const userId = authResult.user.id

    const supabase = getServerSupabase(request)

    // Get or create Stripe customer
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, email, name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return errorResponse('User not found', 404)
    }

    let customerId = user.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          user_id: userId
        }
      })
      customerId = customer.id

      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Get pricing for subscription type
    const pricing = SUBSCRIPTION_PRICING[type]
    if (!pricing) {
      return errorResponse('Invalid subscription type', 400)
    }

    // Create or get Stripe price
    let stripePriceId: string

    // Check if we have a cached price ID in environment
    const envPriceKey = `STRIPE_PRICE_${type.toUpperCase()}_MONTHLY`
    const cachedPriceId = process.env[envPriceKey]

    if (cachedPriceId) {
      stripePriceId = cachedPriceId
    } else {
      // Create a new price
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
    }

    // Attach payment method if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      })

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      })
    }

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
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
      social_media: {
        facebook: data.facebook,
        instagram: data.instagram,
        twitter: data.twitter,
        other: data.otherSocial
      },
      logo: data.logo,
      photos: data.photos || [],
      donate_link: data.donateLink,
      prayer_times_link: data.prayerTimesLink,
      sunday_school: data.sundaySchool,
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
      social_media: {
        facebook: data.facebook,
        instagram: data.instagram,
        twitter: data.twitter,
        other: data.otherSocial
      },
      photos: data.photos || [],
      affiliated_mosque_code: data.affiliatedMosqueCode && data.affiliatedMosqueCode !== 'none' 
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
  return await supabase
    .from('nonprofits')
    .insert({
      subscription_id: subscriptionId,
      user_id: userId,
      name: data.orgName || data.name,
      about: data.about || 'No description provided', // Required field - provide fallback
      address: data.address || 'Address not provided', // Required field - provide fallback
      email: data.email,
      phone: data.phone || 'Not provided', // Required field - provide fallback
      website: data.website,
      donate_link: data.donateLink,
      social_media: data.socialMedia ? { raw: data.socialMedia } : null,
      logo: data.logo,
      photos: data.photos || [],
      status: 'pending'
    })
    .select()
    .single()
}
