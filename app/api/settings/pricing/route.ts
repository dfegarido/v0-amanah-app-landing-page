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

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - this is OK, we'll use defaults
        console.log('[Pricing API] No settings found (PGRST116), using defaults')
      } else {
        console.error('[Pricing API] Error fetching pricing settings:', error)
        // Still return defaults instead of error, so the app can function
        return successResponse({
          pricing_mosque: 10000,
          pricing_business: 1000,
          pricing_coupon: 1000,
          pricing_nonprofit: 5000
        })
      }
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
    // Convert from dollars (stored in DB) to cents (expected by frontend)
    const responseData = {
      pricing_mosque: Math.round(Number(settings.pricing_mosque) * 100),
      pricing_business: Math.round(Number(settings.pricing_business) * 100),
      pricing_coupon: Math.round(Number(settings.pricing_coupon) * 100),
      pricing_nonprofit: Math.round(Number(settings.pricing_nonprofit) * 100)
    }
    console.log('[Pricing API] Returning pricing data (converted to cents):', responseData)
    
    return successResponse(responseData)
  } catch (error: any) {
    console.error('[Pricing API] Unexpected error:', error)
    // Return defaults on any error so the app can still function
    return successResponse({
      pricing_mosque: 10000,
      pricing_business: 1000,
      pricing_coupon: 1000,
      pricing_nonprofit: 5000
    })
  }
}

