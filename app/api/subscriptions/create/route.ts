import { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/auth'
import { successResponse, errorResponse, requireAuth, parseRequestBody } from '@/lib/api-helpers'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { computeBenefitEndsOnInclusive, isPromoRedemptionAllowed } from '@/lib/promo-benefit'
import { getStripeForSubscriptionType } from '@/lib/stripe'

// Service role Supabase client for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Default pricing configuration (fallback if no settings in database)
const DEFAULT_SUBSCRIPTION_PRICING = {
  mosque: { amount: 10000, currency: 'usd' }, // $100/month
  business: { amount: 1000, currency: 'usd' }, // $10/month
  coupon: { amount: 1000, currency: 'usd' }, // $10/month
  nonprofit: { amount: 5000, currency: 'usd' } // $50/month
}

function getLocalDateISO(timeZone: string, date: Date = new Date()): string {
  // Returns YYYY-MM-DD for the provided IANA time zone.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  if (!year || !month || !day) return date.toISOString().split('T')[0]
  return `${year}-${month}-${day}`
}

// Fetch pricing from admin settings (uses service role to bypass RLS)
async function getSubscriptionPricing(type: 'mosque' | 'business' | 'coupon' | 'nonprofit') {
  const toCents = (raw: any, fallbackCents: number): number => {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) return fallbackCents

    // admin_settings stores dollars in this project; convert to cents.
    // If value is already large, treat it as already-cents for safety.
    if (parsed <= 500) return Math.round(parsed * 100)
    return Math.round(parsed)
  }

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
        mosque: toCents(settings.pricing_mosque, DEFAULT_SUBSCRIPTION_PRICING.mosque.amount),
        business: toCents(settings.pricing_business, DEFAULT_SUBSCRIPTION_PRICING.business.amount),
        coupon: toCents(settings.pricing_coupon, DEFAULT_SUBSCRIPTION_PRICING.coupon.amount),
        nonprofit: toCents(settings.pricing_nonprofit, DEFAULT_SUBSCRIPTION_PRICING.nonprofit.amount)
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
  promoCode?: string
  timezone?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify Supabase admin key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Subscription Create] SUPABASE_SERVICE_ROLE_KEY is not configured')
      return errorResponse('Database configuration error. Please contact support.', 500)
    }

    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body = await parseRequestBody<CreateSubscriptionRequest>(request)
    if (!body || !body.type || !body.data) {
      return errorResponse('Missing required fields: type and data', 400)
    }

    const { type, data, paymentMethodId, promoCode, timezone } = body
    const userId = authResult.user.id

    if (type === 'nonprofit' && !process.env.STRIPE_SECRET_KEY_NONPROFIT) {
      console.error('[Subscription Create] STRIPE_SECRET_KEY_NONPROFIT is not configured')
      return errorResponse(
        'Nonprofit subscriptions are not configured. Add STRIPE_SECRET_KEY_NONPROFIT to the server environment.',
        503,
      )
    }

    console.log(`[Subscription Create] Type: ${type}, User: ${userId}`)
    console.log(`[Subscription Create] Data:`, JSON.stringify(data, null, 2))

    // Optional promo code validation (applies only to mosque/business subscriptions)
    let appliedPromo: any | null = null
    let isFreePromo = false
    const normalizedPromoCode = promoCode?.trim() ? promoCode.trim().toUpperCase() : null
    if (normalizedPromoCode) {
      if (!timezone || !String(timezone).trim()) {
        return errorResponse('timezone is required when applying a promo code', 400)
      }
      if (type !== 'mosque' && type !== 'business') {
        return errorResponse('This promo code can only be applied to mosque/business subscriptions', 400)
      }

      const { data: promo, error: promoError } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .ilike('code', normalizedPromoCode)
        .limit(1)
        .maybeSingle()

      if (promoError || !promo) {
        return errorResponse('Invalid promo code', 400)
      }

      // Enabled toggle
      if (!promo.enabled) {
        return errorResponse('This promo code is disabled', 400)
      }

      // Apply-to selection (separate promos for mosque vs business)
      if (promo.applies_to !== type) {
        return errorResponse('This promo code does not apply to your subscription type', 400)
      }

      // Redemption window uses the user's timezone (signup deadline vs optional start date).
      const localToday = getLocalDateISO(String(timezone))
      if (!isPromoRedemptionAllowed(promo, localToday)) {
        return errorResponse(
          'This promo code cannot be applied today (not started yet, past signup deadline, or inactive)',
          400
        )
      }

      // Enforce unique user usage per promo code
      const { data: existingRedemption } = await supabaseAdmin
        .from('promo_code_redemptions')
        .select('id')
        .eq('promo_code_id', promo.id)
        .eq('user_id', userId)
        .maybeSingle()

      if (existingRedemption) {
        return errorResponse('Promo code already used by this account', 400)
      }

      // Enforce max_users (unique users)
      if (promo.max_users !== null && promo.max_users !== undefined) {
        const { count: usedCount, error: countError } = await supabaseAdmin
          .from('promo_code_redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('promo_code_id', promo.id)
          .eq('status', 'active')

        if (countError) {
          console.error('[Promo] max_users count error:', countError)
          return errorResponse('Failed to validate promo usage', 500)
        }

        if ((usedCount || 0) >= promo.max_users) {
          return errorResponse('This promo code has reached its usage limit', 400)
        }
      }

      appliedPromo = promo
      isFreePromo = promo.promo_type === 'free'
    }

    const supabase = getServerSupabase(request)

    // Stripe customer is required for all paid flows and FREE promos (collect card for future billing).
    let customerId: string | null = null
    let stripePriceId: string | null = null
    let stripeSubscription: Stripe.Subscription | null = null

    // Only select stripe_customer_id_nonprofit for nonprofit flows — avoids Postgres 42703 if migration 056
    // has not been applied yet (business/mosque/coupon do not need that column).
    const userColumns =
      type === 'nonprofit'
        ? 'stripe_customer_id, stripe_customer_id_nonprofit, email, name'
        : 'stripe_customer_id, email, name'

    const { data: user, error: userError } = await supabase
      .from('users')
      .select(userColumns)
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('[Subscription Create] User not found:', userError)
      return errorResponse('User not found', 404)
    }

    customerId =
      type === 'nonprofit'
        ? (user as { stripe_customer_id_nonprofit?: string | null }).stripe_customer_id_nonprofit ?? null
        : user.stripe_customer_id

    if (!customerId) {
      console.log('[Stripe] Creating new customer for:', user.email, type === 'nonprofit' ? '(nonprofit account)' : '')
      try {
        const stripe = getStripeForSubscriptionType(type)
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: {
            user_id: userId,
          },
        })
        customerId = customer.id
        console.log('[Stripe] Customer created:', customerId)

        await supabaseAdmin
          .from('users')
          .update(
            type === 'nonprofit'
              ? { stripe_customer_id_nonprofit: customerId }
              : { stripe_customer_id: customerId },
          )
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

    // FREE promo: $0 Stripe recurring price so the member still completes Payment Element / saves a card.
    const stripeUnitAmountCents =
      isFreePromo && (type === 'mosque' || type === 'business') ? 0 : pricing.amount

    let subscription: any

    const stripe = getStripeForSubscriptionType(type)

    const productLabel =
      isFreePromo && (type === 'mosque' || type === 'business')
        ? `${type.charAt(0).toUpperCase() + type.slice(1)} Subscription (Promotional $0)`
        : `${type.charAt(0).toUpperCase() + type.slice(1)} Subscription`

    console.log(
      `[Stripe] Creating new price for ${type} at $${stripeUnitAmountCents / 100}` +
        (isFreePromo ? ' [FREE promo — Stripe $0, list price tracked in app]' : ''),
    )
    try {
      const price = await stripe.prices.create({
        currency: pricing.currency,
        unit_amount: stripeUnitAmountCents,
        recurring: {
          interval: 'month',
        },
        product_data: {
          name: productLabel,
        },
      })
      stripePriceId = price.id
      console.log(`[Stripe] Price created: ${stripePriceId}`)
    } catch (stripeError: any) {
      console.error('[Stripe] Price creation failed:', stripeError.message)
      console.error('[Stripe] Error details:', stripeError)
      return errorResponse(`Stripe error: ${stripeError.message}`, 500)
    }

    if (paymentMethodId) {
      console.log(`[Stripe] Attaching payment method: ${paymentMethodId}`)
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId!,
        })

        await stripe.customers.update(customerId!, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        })
        console.log('[Stripe] Payment method attached successfully')
      } catch (stripeError: any) {
        console.error('[Stripe] Payment method attach failed:', stripeError.message)
        console.error('[Stripe] Error details:', stripeError)
        return errorResponse(`Stripe error: ${stripeError.message}`, 500)
      }
    }

    console.log(`[Stripe] Creating subscription for customer: ${customerId}`)
    try {
      stripeSubscription = await stripe.subscriptions.create({
        customer: customerId!,
        items: [{ price: stripePriceId! }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          user_id: userId,
          subscription_type: type,
          ...(isFreePromo ? { promo_free: 'true' } : {}),
        },
      })
      console.log(`[Stripe] Subscription created: ${stripeSubscription.id}`)
    } catch (stripeError: any) {
      console.error('[Stripe] Subscription creation failed:', stripeError.message)
      console.error('[Stripe] Error details:', stripeError)
      return errorResponse(`Stripe error: ${stripeError.message}`, 500)
    }

    // Payment Element secret: invoice PaymentIntent when amount due, or SetupIntent for $0 (FREE promo) invoices.
    let clientSecret: string | null = null
    let confirmationType: 'payment_intent' | 'setup_intent' = 'payment_intent'

    const latestInvoiceFromSub: any = stripeSubscription.latest_invoice
    clientSecret = latestInvoiceFromSub?.payment_intent?.client_secret ?? null

    if (!clientSecret && isFreePromo && (type === 'mosque' || type === 'business')) {
      try {
        const setupIntent = await stripe.setupIntents.create({
          customer: customerId!,
          payment_method_types: ['card'],
          metadata: {
            user_id: userId,
            stripe_subscription_id: stripeSubscription.id,
          },
        })
        clientSecret = setupIntent.client_secret
        confirmationType = 'setup_intent'
      } catch (siError: any) {
        console.error('[Stripe] SetupIntent for FREE promo failed:', siError)
        await stripe.subscriptions.cancel(stripeSubscription.id)
        return errorResponse(siError?.message || 'Failed to start card collection', 500)
      }
    }

    const { data: subData, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        type: type,
        status: 'active',
        app_status: 'pending_verification',
        stripe_subscription_id: stripeSubscription!.id,
        stripe_customer_id: customerId!,
        stripe_price_id: stripePriceId!,
        // List price in dollars (used for kickbacks / promos); dashboard effective price still comes from promo redemption.
        price_amount: pricing.amount / 100,
        currency: pricing.currency,
        current_period_start: new Date(stripeSubscription!.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription!.current_period_end * 1000).toISOString(),
        next_billing_date: new Date(stripeSubscription!.current_period_end * 1000).toISOString(),
      })
      .select()
      .single()

    if (subscriptionError || !subData) {
      console.error('[Subscription Create] ❌ Database error creating subscription:', subscriptionError)
      console.error('[Subscription Create] Error code:', subscriptionError?.code)
      console.error('[Subscription Create] Error message:', subscriptionError?.message)
      console.error('[Subscription Create] Error details:', subscriptionError?.details)
      console.error('[Subscription Create] Error hint:', subscriptionError?.hint)

      if (stripeSubscription?.id) {
        await stripe.subscriptions.cancel(stripeSubscription.id)
      }

      return errorResponse(
        `Failed to create subscription: ${subscriptionError?.message || subscriptionError?.details || 'Unknown error'}`,
        500,
      )
    }

    subscription = subData

    console.log('[Subscription Create] ✅ Subscription created successfully:', subscription.id)

    // Create entity-specific record based on type
    let entityRecord: any
    let entityError: any

    switch (type) {
      case 'mosque':
        const { data: mosqueData, error: mosqueError } = await createMosqueRecord(
          supabaseAdmin, // Use admin client to bypass RLS
          subscription.id,
          userId,
          data
        )
        entityRecord = mosqueData
        entityError = mosqueError
        break

      case 'business':
        const { data: businessData, error: businessError } = await createBusinessRecord(
          supabaseAdmin, // Use admin client to bypass RLS
          subscription.id,
          userId,
          data
        )
        entityRecord = businessData
        entityError = businessError
        break

      case 'coupon':
        const { data: couponData, error: couponError } = await createCouponRecord(
          supabaseAdmin, // Use admin client to bypass RLS
          subscription.id,
          userId,
          data
        )
        entityRecord = couponData
        entityError = couponError
        break

      case 'nonprofit':
        const { data: nonprofitData, error: nonprofitError } = await createNonprofitRecord(
          supabaseAdmin, // Use admin client to bypass RLS
          subscription.id,
          userId,
          data
        )
        entityRecord = nonprofitData
        entityError = nonprofitError
        break
    }

    if (entityError) {
      console.error(`[Subscription Create] ❌ Error creating ${type} record:`, entityError)
      console.error(`[Subscription Create] Error code:`, entityError.code)
      console.error(`[Subscription Create] Error message:`, entityError.message)
      console.error(`[Subscription Create] Error details:`, entityError.details)
      console.error(`[Subscription Create] Error hint:`, entityError.hint)
      console.error(`[Subscription Create] Data sent:`, JSON.stringify(data, null, 2))
      // Rollback: Delete subscription and cancel Stripe subscription
      await supabaseAdmin.from('subscriptions').delete().eq('id', subscription.id)
      if (stripeSubscription?.id) {
        const stripeRollback = getStripeForSubscriptionType(type)
        await stripeRollback.subscriptions.cancel(stripeSubscription.id)
      }
      return errorResponse(`Failed to create ${type} record: ${entityError.message || entityError.details || 'Unknown error'}`, 500)
    }
    
    console.log(`[Subscription Create] ✅ ${type} record created successfully:`, entityRecord?.id)

    // Handle additional donations for business subscriptions
    if (type === 'business' && data.donationOrganizations && Array.isArray(data.donationOrganizations) && data.donationOrganizations.length > 0) {
      console.log('[Additional Donations] Processing donations:', data.donationOrganizations)
      console.log('[Additional Donations] Donation amount per org:', data.donationAmount)
      
      const donationAmount = parseFloat(data.donationAmount) || 10.00

      for (const orgString of data.donationOrganizations) {
        if (!orgString || typeof orgString !== 'string') continue

        // Parse the format: 'mosque-51' or 'nonprofit-{uuid}'
        // Split only on the FIRST dash to preserve UUIDs which contain dashes
        const firstDashIndex = orgString.indexOf('-')
        if (firstDashIndex === -1) {
          console.error('[Additional Donations] Invalid org format (no dash):', orgString)
          continue
        }

        const orgType = orgString.substring(0, firstDashIndex)
        const orgIdentifier = orgString.substring(firstDashIndex + 1)
        
        if (!orgType || !orgIdentifier) {
          console.error('[Additional Donations] Invalid org format:', orgString)
          continue
        }

        let organizationId: string | null = null

        if (orgType === 'mosque') {
          // For mosques, orgIdentifier is the mosque_code, we need to get the actual UUID
          const mosqueCode = parseInt(orgIdentifier)
          if (isNaN(mosqueCode)) {
            console.error('[Additional Donations] Invalid mosque code:', orgIdentifier)
            continue
          }

          const { data: mosque } = await supabaseAdmin
            .from('mosques')
            .select('id')
            .eq('mosque_code', mosqueCode)
            .single()

          if (mosque) {
            organizationId = mosque.id
          } else {
            console.error('[Additional Donations] Mosque not found for code:', mosqueCode)
            continue
          }
        } else if (orgType === 'nonprofit') {
          // For nonprofits, orgIdentifier is already the UUID
          organizationId = orgIdentifier
          
          // Verify the nonprofit exists
          const { data: nonprofit, error: nonprofitError } = await supabaseAdmin
            .from('nonprofits')
            .select('id')
            .eq('id', organizationId)
            .single()

          if (nonprofitError || !nonprofit) {
            console.error('[Additional Donations] Nonprofit not found:', organizationId, nonprofitError)
            continue
          }
        } else {
          console.error('[Additional Donations] Unknown org type:', orgType)
          continue
        }

        if (!organizationId) {
          console.error('[Additional Donations] No organization ID found for:', orgString)
          continue
        }

        console.log(`[Additional Donations] Inserting donation for ${orgType}:`, organizationId, 'amount:', donationAmount)

        // Insert the donation
        const { data: insertedDonation, error: donationError } = await supabaseAdmin
          .from('additional_donations')
          .insert({
            subscription_id: subscription.id,
            organization_type: orgType as 'mosque' | 'nonprofit',
            organization_id: organizationId,
            amount_per_month: donationAmount
          })
          .select()

        if (donationError) {
          console.error('[Additional Donations] ❌ Error inserting donation:', donationError)
          console.error('[Additional Donations] Error details:', JSON.stringify(donationError, null, 2))
          // Continue even if one donation fails
        } else {
          console.log(`[Additional Donations] ✅ Successfully inserted donation for ${orgType}:`, organizationId)
          console.log('[Additional Donations] Inserted data:', insertedDonation)
        }
      }
    }

    // Record promo redemption so the dashboard can show the monthly discount
    if (appliedPromo) {
      const benefitMonthsNum =
        appliedPromo.benefit_months != null && appliedPromo.benefit_months !== ''
          ? Number(appliedPromo.benefit_months)
          : NaN
      const benefitEndsOn =
        Number.isFinite(benefitMonthsNum) && benefitMonthsNum >= 1
          ? computeBenefitEndsOnInclusive(
              getLocalDateISO(String(timezone || 'UTC')),
              Math.floor(benefitMonthsNum)
            )
          : null

      const { error: redemptionError } = await supabaseAdmin
        .from('promo_code_redemptions')
        .insert({
          promo_code_id: appliedPromo.id,
          user_id: userId,
          subscription_id: subscription.id,
          normal_price_cents: pricing.amount,
          status: 'active',
          benefit_ends_on: benefitEndsOn,
        })

      if (redemptionError) {
        console.error('[Promo] Failed to insert redemption:', redemptionError)
        return errorResponse('Failed to apply promo code', 500)
      }
    }

    const requiresAction =
      stripeSubscription.status === 'incomplete' || confirmationType === 'setup_intent'

    return successResponse(
      {
        subscription,
        entity: entityRecord,
        clientSecret,
        confirmationType: clientSecret ? confirmationType : null,
        requiresAction,
      },
      'Subscription created successfully',
    )

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
      title: data.title, // Business Name
      fax: data.fax, // Fax number
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
