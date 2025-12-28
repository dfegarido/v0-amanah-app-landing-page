import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse, parseRequestBody, requireRole } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

interface CreateDonationRequest {
  amount: number
  currency?: string
  donorName?: string
  donorEmail?: string
  mosqueId?: string
  mosqueCode?: number
  campaignName?: string
  purpose?: string
  paymentProvider: 'stripe' | 'paypal'
}

// POST /api/donations - Create donation intent
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body = await parseRequestBody<CreateDonationRequest>(request)
    if (!body || !body.amount || !body.paymentProvider) {
      return errorResponse('Missing required fields: amount and paymentProvider', 400)
    }

    // Validate amount
    if (body.amount <= 0) {
      return errorResponse('Amount must be greater than 0', 400)
    }

    if (body.amount < 0.5) {
      return errorResponse('Minimum donation amount is $0.50', 400)
    }

    // Validate payment provider
    if (!['stripe', 'paypal'].includes(body.paymentProvider)) {
      return errorResponse('Invalid payment provider. Use "stripe" or "paypal"', 400)
    }

    const supabase = getServerSupabase(request)

    // Verify mosque exists if provided
    if (body.mosqueId) {
      const { data: mosque, error: mosqueError } = await supabase
        .from('mosques')
        .select('id, mosque_code')
        .eq('id', body.mosqueId)
        .single()

      if (mosqueError || !mosque) {
        return errorResponse('Mosque not found', 404)
      }

      // Use mosque code from database
      body.mosqueCode = mosque.mosque_code
    }

    // Create payment intent
    let paymentIntentId: string
    let clientSecret: string
    let providerCustomerId: string | undefined

    if (body.paymentProvider === 'stripe') {
      try {
        // Lazy import Stripe service only when needed
        const { createStripeDonationIntent } = await import('@/lib/donations/service')
        
        const intent = await createStripeDonationIntent({
          amount: body.amount,
          currency: body.currency || 'usd',
          userId: authResult.user.id,
          donorName: body.donorName || authResult.user.name || undefined,
          donorEmail: body.donorEmail || authResult.user.email,
          mosqueId: body.mosqueId,
          mosqueCode: body.mosqueCode,
          campaignName: body.campaignName,
          purpose: body.purpose,
        })

        paymentIntentId = intent.paymentIntentId
        clientSecret = intent.clientSecret
      } catch (error: any) {
        console.error('Error creating Stripe payment intent:', error)
        return errorResponse(`Failed to create payment intent: ${error.message}`, 500)
      }
    } else {
      // PayPal implementation pending
      return errorResponse('PayPal integration not yet available', 501)
    }

    // Create donation record in database
    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .insert({
        user_id: authResult.user.id,
        donor_name: body.donorName || authResult.user.name || null,
        donor_email: body.donorEmail || authResult.user.email,
        amount: body.amount,
        currency: body.currency || 'USD',
        status: 'pending',
        payment_provider: body.paymentProvider,
        provider_payment_id: paymentIntentId,
        provider_customer_id: providerCustomerId || null,
        mosque_id: body.mosqueId || null,
        mosque_code: body.mosqueCode || null,
        campaign_name: body.campaignName || null,
        purpose: body.purpose || null,
        metadata: {
          created_via: 'api',
        },
      })
      .select()
      .single()

    if (donationError) {
      console.error('Error creating donation record:', donationError)
      return errorResponse('Failed to create donation record', 500)
    }

    return successResponse({
      donation,
      paymentIntent: {
        id: paymentIntentId,
        clientSecret,
      },
    }, 'Donation intent created successfully')
  } catch (error: any) {
    console.error('Create donation error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// GET /api/donations - List donations
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const supabase = getServerSupabase(request)
    const { searchParams } = new URL(request.url)

    // Query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    const status = searchParams.get('status') // Filter by status
    const mosqueId = searchParams.get('mosque_id') // Filter by mosque
    const mosqueCode = searchParams.get('mosque_code') // Filter by mosque code
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Build query
    let query = supabase
      .from('donations')
      .select(`
        *,
        mosque:mosques(id, name, mosque_code)
      `)
      .order('created_at', { ascending: false })

    // Apply filters based on user role
    if (authResult.user.role === 'admin') {
      // Admins see all donations
      // No additional filter needed
    } else {
      // Regular users see only their donations
      query = query.eq('user_id', authResult.user.id)
    }

    // Apply optional filters
    if (status) {
      query = query.eq('status', status)
    }

    if (mosqueId) {
      query = query.eq('mosque_id', mosqueId)
    }

    if (mosqueCode) {
      query = query.eq('mosque_code', parseInt(mosqueCode))
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: donations, error: donationsError } = await query

    if (donationsError) {
      console.error('Error fetching donations:', donationsError)
      return errorResponse('Failed to fetch donations', 500)
    }

    // Get total count
    let countQuery = supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })

    if (authResult.user.role !== 'admin') {
      countQuery = countQuery.eq('user_id', authResult.user.id)
    }

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    if (mosqueId) {
      countQuery = countQuery.eq('mosque_id', mosqueId)
    }

    if (mosqueCode) {
      countQuery = countQuery.eq('mosque_code', parseInt(mosqueCode))
    }

    if (startDate) {
      countQuery = countQuery.gte('created_at', startDate)
    }

    if (endDate) {
      countQuery = countQuery.lte('created_at', endDate)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting donations:', countError)
    }

    return successResponse({
      donations: donations || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Get donations error:', error)
    return errorResponse('Internal server error', 500)
  }
}

