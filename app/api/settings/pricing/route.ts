import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { createClient } from '@supabase/supabase-js'

// GET pricing settings (public endpoint)
export async function GET(request: NextRequest) {
  try {
    console.log('[Pricing API] Endpoint called')
    
    // Use service role client to bypass RLS for reading public pricing data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch pricing settings from database
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('pricing_mosque, pricing_business, pricing_coupon, pricing_nonprofit')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[Pricing API] Error fetching pricing settings:', error)
      return errorResponse('Failed to fetch pricing settings', 500)
    }

    // Return default pricing if no settings exist
    if (!settings) {
      console.log('[Pricing API] No settings found in database, returning defaults')
      return successResponse({
        pricing_mosque: 10000, // $100 in cents
        pricing_business: 1000, // $10 in cents
        pricing_coupon: 1000, // $10 in cents
        pricing_nonprofit: 5000 // $50 in cents
      })
    }

    console.log('[Pricing API] Found settings in database:', settings)
    const responseData = {
      pricing_mosque: settings.pricing_mosque,
      pricing_business: settings.pricing_business,
      pricing_coupon: settings.pricing_coupon,
      pricing_nonprofit: settings.pricing_nonprofit
    }
    console.log('[Pricing API] Returning pricing data:', responseData)
    
    return successResponse(responseData)
  } catch (error: any) {
    console.error('[Pricing API] Error:', error)
    return errorResponse('Internal server error', 500)
  }
}

