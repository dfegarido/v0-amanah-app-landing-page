import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/donations/[id]/receipt - Get donation receipt data
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const supabase = getServerSupabase(request)

    // Get donation with related data
    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .select(`
        *,
        mosque:mosques(id, name, mosque_code, address, email, phone),
        user:users(id, name, email)
      `)
      .eq('id', params.id)
      .single()

    if (donationError || !donation) {
      return errorResponse('Donation not found', 404)
    }

    // Verify access
    if (donation.user_id !== authResult.user.id && authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized', 403)
    }

    // Only generate receipt for succeeded donations
    if (donation.status !== 'succeeded') {
      return errorResponse('Receipt is only available for successful donations', 400)
    }

    // Generate receipt data
    const receipt = {
      receipt_number: donation.id.substring(0, 8).toUpperCase(),
      date: donation.paid_at || donation.created_at,
      donor: {
        name: donation.donor_name || donation.user?.name || 'Anonymous',
        email: donation.donor_email || donation.user?.email,
      },
      donation: {
        amount: donation.amount,
        currency: donation.currency,
        purpose: donation.purpose || 'General Donation',
        campaign: donation.campaign_name,
      },
      recipient: {
        name: donation.mosque?.name || 'Amanah Organization',
        address: donation.mosque?.address,
        email: donation.mosque?.email,
        phone: donation.mosque?.phone,
      },
      payment: {
        provider: donation.payment_provider,
        transaction_id: donation.provider_payment_id,
        payment_date: donation.paid_at,
      },
      organization: {
        name: 'Amanah',
        email: 'support@amanah.app',
        website: 'https://amanah.app',
      },
    }

    // If receipt URL exists, include it
    if (donation.receipt_url) {
      return successResponse({
        ...receipt,
        receipt_url: donation.receipt_url,
      })
    }

    // Otherwise return receipt data for frontend to generate PDF
    return successResponse(receipt)
  } catch (error: any) {
    console.error('Get donation receipt error:', error)
    return errorResponse('Internal server error', 500)
  }
}
