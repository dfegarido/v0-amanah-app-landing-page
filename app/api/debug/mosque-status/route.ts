import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/admin-helpers'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mosqueCode = searchParams.get('mosqueCode')

  if (!mosqueCode) {
    return errorResponse('Mosque code is required', 400)
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: mosque, error } = await supabaseAdmin
    .from('mosques')
    .select('id, name, mosque_code, stripe_account_id, stripe_payouts_enabled, stripe_charges_enabled, stripe_onboarding_complete')
    .eq('mosque_code', parseInt(mosqueCode))
    .single()

  if (error || !mosque) {
    return errorResponse('Mosque not found', 404)
  }

  // Also check if there are any payout records
  const { data: payouts } = await supabaseAdmin
    .from('mosque_payouts')
    .select('*')
    .eq('mosque_code', parseInt(mosqueCode))
    .order('created_at', { ascending: false })
    .limit(10)

  return successResponse({
    mosque,
    recentPayouts: payouts || []
  })
}

