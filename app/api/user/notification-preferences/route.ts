import { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/auth'
import { requireAuth, successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'

interface NotificationPreferences {
  email_notifications?: boolean
  payment_reminders?: boolean
  monthly_reports?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const supabase = getServerSupabase(request)

    // Get notification preferences
    const { data, error } = await supabase
      .from('users')
      .select('email_notifications, payment_reminders, monthly_reports')
      .eq('id', authResult.user.id)
      .single()

    if (error) {
      console.error('Error fetching preferences:', error)
      return errorResponse('Failed to fetch notification preferences', 500)
    }

    return successResponse(data, 'Notification preferences retrieved successfully')
  } catch (error: any) {
    console.error('Get preferences error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body = await parseRequestBody<NotificationPreferences>(request)
    
    if (!body) {
      return errorResponse('Invalid request body', 400)
    }

    const supabase = getServerSupabase(request)
    
    const updateData: NotificationPreferences = {}
    if (body.email_notifications !== undefined) updateData.email_notifications = body.email_notifications
    if (body.payment_reminders !== undefined) updateData.payment_reminders = body.payment_reminders
    if (body.monthly_reports !== undefined) updateData.monthly_reports = body.monthly_reports

    // Update notification preferences
    const { data: updatedPrefs, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', authResult.user.id)
      .select('email_notifications, payment_reminders, monthly_reports')
      .single()

    if (updateError) {
      console.error('Preferences update error:', updateError)
      return errorResponse('Failed to update notification preferences', 500)
    }

    return successResponse(updatedPrefs, 'Notification preferences updated successfully')
  } catch (error: any) {
    console.error('Update preferences error:', error)
    return errorResponse('Internal server error', 500)
  }
}
