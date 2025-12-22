import { NextRequest } from 'next/server'
import { successResponse, errorResponse, requireAuth, parseRequestBody } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

interface AdminSettings {
  // General
  platform_name?: string
  support_email?: string
  contact_phone?: string
  website_url?: string
  
  // Pricing
  pricing_mosque?: number
  pricing_business?: number
  pricing_coupon?: number
  pricing_nonprofit?: number
  
  // Revenue Distribution
  mosque_kickback_percentage?: number
  education_fund_percentage?: number
  
  // Notifications
  notification_email?: string
  notify_new_subscription?: boolean
  notify_payment_failed?: boolean
  notify_subscription_cancelled?: boolean
  notify_push_requests?: boolean
  notify_member_updates?: boolean
}

// GET admin settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const supabase = getServerSupabase(request)

    // Fetch settings from database
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching settings:', error)
      return errorResponse('Failed to fetch settings', 500)
    }

    // Return default settings if none exist
    if (!settings) {
      return successResponse({
        platform_name: 'Amanah',
        support_email: 'support@amanah.app',
        contact_phone: '+1 (555) 123-4567',
        website_url: 'https://amanah.app',
        pricing_mosque: 100,
        pricing_business: 10,
        pricing_coupon: 10,
        pricing_nonprofit: 50,
        mosque_kickback_percentage: 10,
        education_fund_percentage: 15,
        notification_email: 'josh@mobileappcity.com',
        notify_new_subscription: true,
        notify_payment_failed: true,
        notify_subscription_cancelled: true,
        notify_push_requests: true,
        notify_member_updates: true
      })
    }

    return successResponse(settings)
  } catch (error: any) {
    console.error('Get settings error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// PUT/UPDATE admin settings
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const body = await parseRequestBody<AdminSettings>(request)
    if (!body) {
      return errorResponse('Invalid request body', 400)
    }

    const supabase = getServerSupabase(request)

    // Check if settings exist
    const { data: existing } = await supabase
      .from('admin_settings')
      .select('id')
      .single()

    let result

    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from('admin_settings')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      result = { data, error }
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from('admin_settings')
        .insert({
          ...body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      result = { data, error }
    }

    if (result.error) {
      console.error('Error saving settings:', result.error)
      return errorResponse('Failed to save settings', 500)
    }

    return successResponse(result.data, 'Settings saved successfully')
  } catch (error: any) {
    console.error('Save settings error:', error)
    return errorResponse('Internal server error', 500)
  }
}

