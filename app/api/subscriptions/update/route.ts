import { NextRequest } from 'next/server'
import { successResponse, errorResponse, requireAuth, parseRequestBody } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/admin-helpers'
import { sendEmail } from '@/lib/notifications/email-service'

interface UpdateSubscriptionRequest {
  subscriptionId: string
  type: 'mosque' | 'business' | 'coupon' | 'nonprofit'
  data: Record<string, any>
  additionalDonations?: {id: string, type: 'mosque'|'nonprofit', amount: string}[]
}

// POST /api/subscriptions/update - Create change request for subscription updates
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body = await parseRequestBody<UpdateSubscriptionRequest>(request)
    if (!body || !body.subscriptionId || !body.type || !body.data) {
      return errorResponse('Invalid request body', 400)
    }

    const { subscriptionId, type, data, additionalDonations } = body
    const supabase = getServerSupabase(request)
    const supabaseAdmin = getSupabaseAdmin()

    // Verify subscription belongs to user
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id')
      .eq('id', subscriptionId)
      .eq('user_id', authResult.user.id)
      .single()

    if (subError || !subscription) {
      return errorResponse('Subscription not found or access denied', 404)
    }

    // Get the table name based on type
    const getTableName = (subscriptionType: string): string => {
      if (subscriptionType === 'business') return 'businesses'
      return `${subscriptionType}s`
    }

    const tableName = getTableName(type)

    // Get current entity data (for comparison)
    const { data: currentEntity, error: entityError } = await supabase
      .from(tableName)
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single()

    if (entityError || !currentEntity) {
      console.error(`Error fetching current ${type} data:`, entityError)
      return errorResponse(`Failed to fetch current ${type} data`, 500)
    }

    // Get current additional donations
    const { data: currentDonations, error: donationsError } = await supabase
      .from('additional_donations')
      .select('*')
      .eq('subscription_id', subscriptionId)

    if (donationsError) {
      console.error('Error fetching current donations:', donationsError)
    }

    // Helper function to check if a value has changed
    const hasChanged = (newValue: any, oldValue: any): boolean => {
      // Handle null/undefined cases
      if (newValue === oldValue) return false
      if (newValue === '' && (oldValue === null || oldValue === undefined)) return false
      if ((newValue === null || newValue === undefined) && oldValue === '') return false
      
      // For objects/arrays, compare stringified versions
      if (typeof newValue === 'object' || typeof oldValue === 'object') {
        return JSON.stringify(newValue) !== JSON.stringify(oldValue)
      }
      
      return newValue !== oldValue
    }

    // Prepare change data based on type - ONLY include changed fields
    let allChanges: Record<string, any> = {}

    // Map common fields
    if (data.name !== undefined) allChanges.name = data.name
    if (data.address !== undefined) allChanges.address = data.address
    if (data.email !== undefined) allChanges.email = data.email
    if (data.phone !== undefined) allChanges.phone = data.phone
    if (data.website !== undefined) allChanges.website = data.website
    if (data.description !== undefined) allChanges.description = data.description
    if (data.about !== undefined) allChanges.about = data.about
    if (data.services !== undefined) allChanges.services = data.services
    if (data.facebook !== undefined) allChanges.facebook = data.facebook
    if (data.instagram !== undefined) allChanges.instagram = data.instagram
    if (data.twitter !== undefined) allChanges.twitter = data.twitter
    if (data.youtube !== undefined) allChanges.youtube = data.youtube
    if (data.google !== undefined) allChanges.google = data.google
    if (data.tiktok !== undefined) allChanges.tiktok = data.tiktok
    if (data.otherSocial !== undefined) allChanges.other_social = data.otherSocial

    // Type-specific fields
    switch (type) {
      case 'mosque':
        if (data.city !== undefined) allChanges.city = data.city
        if (data.state !== undefined) allChanges.state = data.state
        if (data.zip !== undefined) allChanges.zip = data.zip
        if (data.country !== undefined) allChanges.country = data.country
        if (data.donateLink !== undefined) allChanges.donate_link = data.donateLink
        if (data.prayerTimesLink !== undefined) allChanges.prayer_times_link = data.prayerTimesLink
        if (data.sundaySchool !== undefined) allChanges.sunday_school = data.sundaySchool
        if (data.sundaySchoolLink !== undefined) allChanges.sunday_school_link = data.sundaySchoolLink
        if (data.committeeMembers !== undefined) allChanges.committee_members = data.committeeMembers
        if (data.emergencyContactName !== undefined) allChanges.emergency_contact_name = data.emergencyContactName
        if (data.emergencyContactPhone !== undefined) allChanges.emergency_contact_phone = data.emergencyContactPhone
        break

      case 'nonprofit':
        if (data.donateLink !== undefined) allChanges.donate_link = data.donateLink
        if (data.programsLink !== undefined) allChanges.programs_link = data.programsLink
        if (data.committeeMembers !== undefined) allChanges.committee_members = data.committeeMembers
        break

      case 'business':
        if (data.title !== undefined) allChanges.title = data.title
        if (data.fax !== undefined) allChanges.fax = data.fax
        if (data.category) allChanges.categories = data.category.split(',').map((c: string) => c.trim())
        if (data.subCategory) allChanges.sub_categories = data.subCategory.split(',').map((c: string) => c.trim())
        if (data.city) allChanges.city = data.city
        if (data.state) allChanges.state = data.state
        if (data.zip) allChanges.zip = data.zip
        if (data.country) allChanges.country = data.country
        if (data.contactName !== undefined) allChanges.contact_name = data.contactName
        if (data.contactPhone !== undefined) allChanges.contact_phone = data.contactPhone
        if (data.contactEmail !== undefined) allChanges.contact_email = data.contactEmail
        if (data.comments !== undefined) allChanges.comments = data.comments
        break

      case 'coupon':
        if (data.title) allChanges.title = data.title
        if (data.merchant) allChanges.merchant = data.merchant
        if (data.discount) allChanges.discount_amount = data.discount
        if (data.redeemCode) allChanges.redeem_code = data.redeemCode
        if (data.startDate) allChanges.start_date = data.startDate
        if (data.endDate) allChanges.end_date = data.endDate
        break
    }

    // Filter to only include fields that have actually changed
    const changes: Record<string, any> = {}
    for (const [key, newValue] of Object.entries(allChanges)) {
      if (hasChanged(newValue, currentEntity[key])) {
        changes[key] = newValue
      }
    }

    // Check if additional donations have changed
    let donationsChanged = false
    if (additionalDonations !== undefined) {
      const currentDonationsList = (currentDonations || []).map((d: any) => ({
        id: d.organization_id,
        type: d.organization_type,
        amount: parseFloat(d.amount_per_month).toFixed(2)
      })).sort((a: any, b: any) => a.id.localeCompare(b.id))

      const newDonationsList = additionalDonations.map((d: any) => ({
        id: d.id,
        type: d.type,
        amount: parseFloat(d.amount).toFixed(2)
      })).sort((a: any, b: any) => a.id.localeCompare(b.id))

      donationsChanged = JSON.stringify(currentDonationsList) !== JSON.stringify(newDonationsList)
      
      if (donationsChanged) {
        changes.additional_donations = newDonationsList
      }
    }

    // If no changes detected, return early
    if (Object.keys(changes).length === 0) {
      return successResponse(
        { message: 'No changes detected' },
        'No changes to submit'
      )
    }

    console.log('[Change Request] Detected changes:', Object.keys(changes).length, 'field(s)')

    // Create the change request (use admin client to bypass RLS)
    const { data: changeRequest, error: changeRequestError } = await supabaseAdmin
      .from('subscription_change_requests')
      .insert({
        subscription_id: subscriptionId,
        subscription_type: type,
        user_id: authResult.user.id,
        changes: changes,
        previous_data: currentEntity,
        status: 'pending'
      })
      .select()
      .single()

    if (changeRequestError) {
      console.error(`Error creating change request:`, changeRequestError)
      return errorResponse(`Failed to create change request`, 500)
    }

    console.log('[Change Request] Created change request:', changeRequest.id)

    // Send notifications to admins (fire and forget - don't block the response)
    console.log('[Change Request] Attempting to send admin notifications...')
    sendAdminNotifications(changeRequest.id, subscriptionId, type, currentEntity, authResult.user.id, changes).catch((error) => {
      console.error('[Change Request] Failed to send admin notifications:', error)
      // Don't fail the request if notifications fail
    })

    return successResponse(
      { changeRequest, message: 'Change request submitted successfully. Waiting for admin approval.' },
      'Change request submitted successfully'
    )
  } catch (error: any) {
    console.error('Update subscription error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// Helper function to send notifications to admins about change requests
async function sendAdminNotifications(
  changeRequestId: string,
  subscriptionId: string,
  type: string,
  entity: any,
  userId: string,
  changes: Record<string, any>
) {
  try {
    console.log('[sendAdminNotifications] Starting notification process...')
    console.log('[sendAdminNotifications] Change Request ID:', changeRequestId)
    console.log('[sendAdminNotifications] Subscription ID:', subscriptionId)
    console.log('[sendAdminNotifications] Type:', type)
    console.log('[sendAdminNotifications] Entity name:', entity.name || entity.title)
    
    // Use admin client to read settings (bypasses RLS)
    const supabaseAdmin = getSupabaseAdmin()
    
    // Check if admin notifications are enabled (optional check - proceed if settings don't exist)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('notify_member_updates, notification_email')
      .maybeSingle()  // Use maybeSingle() instead of single() to handle 0 rows gracefully

    console.log('[sendAdminNotifications] Admin settings:', settings)
    console.log('[sendAdminNotifications] Settings error:', settingsError)

    // If settings exist and notifications are explicitly disabled, skip
    if (settings && settings.notify_member_updates === false) {
      console.log('[sendAdminNotifications] ⚠️  Admin member update notifications are explicitly disabled')
      return
    }
    
    // If no settings exist, proceed anyway (default to enabled)
    if (!settings) {
      console.log('[sendAdminNotifications] ℹ️  No admin settings found, proceeding with default behavior (enabled)')
    }

    // Get all admin users (use admin client to bypass RLS)
    const { data: admins, error: adminsError} = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('role', 'admin')

    console.log('[sendAdminNotifications] Admin users found:', admins?.length || 0)
    console.log('[sendAdminNotifications] Admins error:', adminsError)

    if (adminsError || !admins || admins.length === 0) {
      console.warn('[sendAdminNotifications] ⚠️  No admin users found for notifications')
      return
    }

    const entityName = entity.name || entity.title || 'Unknown'
    const typeName = type.charAt(0).toUpperCase() + type.slice(1)
    const changeCount = Object.keys(changes).length

    console.log('[sendAdminNotifications] Creating in-app notifications for', admins.length, 'admins')

    // Create in-app notifications for each admin (use admin client)
    const notificationPromises = admins.map(async (admin) => {
      console.log('[sendAdminNotifications] Creating notification for admin:', admin.email)
      const { data: result, error: notifError } = await supabaseAdmin.rpc('create_notification', {
        p_user_id: admin.id,
        p_type: 'admin_action',
        p_title: '⏳ Change Request Pending Approval',
        p_message: `${entityName} (${typeName}) has requested ${changeCount} change(s) to their subscription. Review and approve/reject.`,
        p_metadata: {
          change_request_id: changeRequestId,
          subscription_id: subscriptionId,
          subscription_type: type,
          entity_name: entityName,
          requested_by: userId,
          change_count: changeCount
        },
        p_related_entity_type: 'change_request',
        p_related_entity_id: changeRequestId
      })
      
      if (notifError) {
        console.error('[sendAdminNotifications] Error creating notification for', admin.email, ':', notifError)
      } else {
        console.log('[sendAdminNotifications] ✅ Notification created for', admin.email, ':', result)
      }
      
      return { result, error: notifError }
    })

    const results = await Promise.all(notificationPromises)
    const successCount = results.filter(r => !r.error).length
    console.log(`[sendAdminNotifications] ✅ Created ${successCount}/${admins.length} in-app notification(s) for admins`)

    // Format changes for email
    const changesHtml = Object.entries(changes)
      .map(([key, value]) => {
        const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        let displayValue = value
        if (typeof value === 'object') {
          displayValue = JSON.stringify(value, null, 2)
        }
        return `<li><strong>${displayKey}:</strong> ${displayValue}</li>`
      })
      .join('')

    // Send email notifications
    const emailPromises = admins.map(admin =>
      sendEmail({
        to: admin.email,
        subject: '⏳ Change Request Pending Approval',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>🔔 Change Request Requires Your Approval</h2>
            <p>Hi ${admin.name || 'Admin'},</p>
            <p>A member has submitted a change request for their subscription that requires your approval:</p>
            
            <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Status:</strong> ⏳ Pending Approval</p>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${typeName}</p>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${entityName}</p>
              <p style="margin: 5px 0;"><strong>Change Request ID:</strong> ${changeRequestId}</p>
            </div>
            
            <h3>Requested Changes (${changeCount}):</h3>
            <ul style="background-color: #f5f5f5; padding: 15px 30px; border-radius: 5px;">
              ${changesHtml}
            </ul>
            
            <p><strong>Action Required:</strong> Please review and approve or reject this change request in the admin dashboard.</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://amanahbiz.com'}/admin/change-requests" 
               style="display: inline-block; background-color: #ffc107; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">
              Review Change Requests
            </a>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This is an automated notification from Amanah. You're receiving this because you're an administrator.
            </p>
          </div>
        `
      })
    )

    await Promise.all(emailPromises)
    console.log(`✅ Sent ${admins.length} email notification(s) to admins`)
  } catch (error) {
    console.error('Error in sendAdminNotifications:', error)
    throw error
  }
}

