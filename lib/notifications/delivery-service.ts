/**
 * Notification Delivery Service
 * 
 * Handles delivering notifications via email and push after they're created in the database.
 * This service is called from notification hooks after the DB record is created.
 */

import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './email-service'
import {
  messageReceivedTemplate,
  donationConfirmedTemplate,
  donationFailedTemplate,
  eventUpdatedTemplate,
  adminDonationNotificationTemplate,
  baseTemplate,
} from './email-templates'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  metadata?: any
  related_entity_type?: string
  related_entity_id?: string
}

/**
 * Get user email address
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    console.log('📧 getUserEmail: Fetching email for userId:', userId)
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ getUserEmail: Error fetching user email:', error)
      return null
    }

    if (!user) {
      console.error('❌ getUserEmail: No user found for userId:', userId)
      return null
    }

    console.log('✅ getUserEmail: User found, email:', user.email)
    return user.email
  } catch (error: any) {
    console.error('❌ getUserEmail: Exception fetching user email:', error)
    console.error('   Error message:', error?.message)
    console.error('   Error stack:', error?.stack)
    return null
  }
}

/**
 * Check if user has email notifications enabled
 * TODO: Check user preferences when implemented
 */
async function shouldSendEmail(userId: string, type: string): Promise<boolean> {
  // For now, always send (we'll add preferences later)
  // TODO: Query user_notification_preferences table
  return true
}

/**
 * Get app base URL for links in emails
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

/**
 * Deliver notification via email
 */
export async function deliverEmailNotification(
  notification: Notification
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 deliverEmailNotification called for:', notification.id, notification.type)
    console.log('📧 Notification details:', {
      id: notification.id,
      type: notification.type,
      userId: notification.user_id,
      title: notification.title,
    })
    
    // Check if email should be sent
    console.log('📧 Checking if email should be sent...')
    const shouldSend = await shouldSendEmail(notification.user_id, notification.type)
    console.log('📧 shouldSendEmail result:', shouldSend)
    
    if (!shouldSend) {
      console.log('⏭️ Email skipped due to user preferences:', notification.id)
      return { success: true }
    }

    // Get user info for template (includes email, so we don't need to fetch twice)
    console.log('📧 Fetching user info for template (includes email)...')
    let userEmail: string | null = null
    let user: { name?: string; email?: string } | null = null
    
    try {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('name, email')
        .eq('id', notification.user_id)
        .single()

      if (userError) {
        console.error('❌ Error fetching user info:', userError)
        return { success: false, error: 'User not found' }
      }

      if (!userData) {
        console.warn('⚠️ No user found for userId:', notification.user_id)
        return { success: false, error: 'User not found' }
      }

      user = userData
      userEmail = userData.email || null
      console.log('✅ User info fetched:', { name: user.name, email: userEmail })
    } catch (error: any) {
      console.error('❌ Exception fetching user info:', error)
      return { success: false, error: error.message || 'Failed to fetch user info' }
    }
    
    if (!userEmail) {
      console.warn('⚠️ No email found for user:', notification.user_id)
      return { success: false, error: 'User email not found' }
    }

    console.log('📧 Preparing to send email to:', userEmail)

    const baseUrl = getBaseUrl()
    let html = ''
    let subject = notification.title

    console.log('📧 Step 3: Generating email template for type:', notification.type)
    console.log('📧 Notification metadata:', JSON.stringify(notification.metadata, null, 2))

    // Generate email template based on notification type
    try {
      switch (notification.type) {
      case 'new_message':
        html = messageReceivedTemplate({
          userName: user?.name || undefined,
          senderName: notification.metadata?.sender_name || 'Someone',
          senderEmail: notification.metadata?.sender_email,
          subject: notification.metadata?.subject || notification.title,
          messagePreview: notification.message.substring(0, 150),
          messageLink: `${baseUrl}/member/messages`,
        })
        break

      case 'donation_confirmed':
        html = donationConfirmedTemplate({
          userName: user?.name || undefined,
          amount: notification.metadata?.amount || 0,
          currency: notification.metadata?.currency || 'USD',
          mosqueName: notification.metadata?.mosque_name,
          donationId: notification.related_entity_id,
          receiptLink: notification.metadata?.receipt_url || `${baseUrl}/member/donations`,
          logoUrl: `${baseUrl}/images/logo-20amanaah.png`,
        })
        break

      case 'donation_failed':
        html = donationFailedTemplate({
          userName: user?.name || undefined,
          amount: notification.metadata?.amount || 0,
          currency: notification.metadata?.currency || 'USD',
          reason: notification.metadata?.reason,
          retryLink: `${baseUrl}/member/donate`,
        })
        break

      case 'event_created':
      case 'event_updated':
        html = eventUpdatedTemplate({
          userName: user?.name || undefined,
          eventName: notification.metadata?.event_name || 'Event',
          mosqueName: notification.metadata?.mosque_name,
          action: notification.type === 'event_created' ? 'created' : 'updated',
          eventLink: notification.related_entity_id
            ? `${baseUrl}/events/${notification.related_entity_id}`
            : undefined,
          eventDate: notification.metadata?.event_date,
          eventTime: notification.metadata?.event_time,
        })
        break

      default:
        // Generic template for other types
        html = baseTemplate(`
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
          <p style="color: #6b7280; font-size: 14px;">You can view this notification in your Amanah account.</p>
        `, notification.title)
      }
      console.log('📧 Template generated successfully, HTML length:', html.length)
    } catch (templateError: any) {
      console.error('❌ Error generating email template:', templateError)
      throw templateError
    }

    console.log('📧 Step 4: Template generation complete, preparing to send email...')
    console.log('📧 Subject:', subject)
    console.log('📧 HTML length:', html.length)

    // Send email
    console.log('📧 Step 5: Calling sendEmail function...')
    console.log('📧 Email details:', {
      to: userEmail,
      subject: subject,
      htmlLength: html.length,
    })
    
    const result = await sendEmail({
      to: userEmail,
      subject,
      html,
    })

    console.log('📧 sendEmail result:', JSON.stringify(result, null, 2))

    if (result.success) {
      console.log('✅ Email delivered:', notification.id, 'to', userEmail)
      return { success: true }
    } else {
      console.error('❌ Email delivery failed:', notification.id, result.error)
      return { success: false, error: result.error }
    }
  } catch (error: any) {
    console.error('❌ Exception delivering email:', error)
    console.error('   Error message:', error.message)
    console.error('   Error stack:', error.stack)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Deliver admin notification emails (e.g., new donation received)
 */
export async function deliverAdminEmailNotification(
  notification: Notification,
  adminEmails: string[]
): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    if (adminEmails.length === 0) {
      return { success: true, sent: 0, failed: 0 }
    }

    const baseUrl = getBaseUrl()
    let html = ''
    let subject = notification.title

    // Generate admin-specific template
    switch (notification.type) {
      case 'donation_confirmed':
        html = adminDonationNotificationTemplate({
          donorName: notification.metadata?.donor_name,
          donorEmail: notification.metadata?.donor_email,
          amount: notification.metadata?.amount || 0,
          currency: notification.metadata?.currency || 'USD',
          mosqueName: notification.metadata?.mosque_name,
          donationLink: notification.related_entity_id
            ? `${baseUrl}/admin/donations/${notification.related_entity_id}`
            : undefined,
          isAnonymous: notification.metadata?.is_anonymous,
        })
        break

      default:
        // Generic admin template
        html = baseTemplate(`
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
        `, notification.title)
    }

    // Send to all admins with rate limiting (Resend allows 2 requests/second)
    // Add delay between sends to avoid rate limits
    const results = []
    for (let i = 0; i < adminEmails.length; i++) {
      const email = adminEmails[i]
      // Add 600ms delay between emails to stay under 2 requests/second limit
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 600))
      }
      
      try {
        const result = await sendEmail({
          to: email,
          subject,
          html,
        })
        results.push({ status: 'fulfilled' as const, value: result })
      } catch (error: any) {
        results.push({ 
          status: 'rejected' as const, 
          reason: error 
        })
      }
    }

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - sent

    console.log(`✅ Admin emails sent: ${sent}/${adminEmails.length} for notification ${notification.id}`)
    return { success: sent > 0, sent, failed }
  } catch (error: any) {
    console.error('❌ Exception delivering admin emails:', error)
    return { success: false, sent: 0, failed: adminEmails.length }
  }
}

/**
 * Deliver push notification
 */
export async function deliverPushNotification(
  notification: Notification
): Promise<{ success: boolean; error?: string }> {
  try {
    // Import push service dynamically to avoid circular dependencies
    const { sendPushToUser, isPushConfigured } = await import('./push-service')

    if (!isPushConfigured()) {
      console.log('⏭️ Push notifications not configured, skipping:', notification.id)
      return { success: false, error: 'Push notifications not configured' }
    }

    // Check if user has push notifications enabled
    // TODO: Check user preferences when implemented
    const shouldSend = true // For now, always send

    if (!shouldSend) {
      console.log('⏭️ Push skipped due to user preferences:', notification.id)
      return { success: true }
    }

    // Get base URL for navigation
    const baseUrl = getBaseUrl()

    // Determine URL based on notification type
    let url = `${baseUrl}/member`
    if (notification.type === 'new_message') {
      url = `${baseUrl}/member/messages`
    } else if (notification.type === 'donation_confirmed' || notification.type === 'donation_failed') {
      url = `${baseUrl}/member/donations`
    } else if (notification.type === 'event_created' || notification.type === 'event_updated') {
      url = notification.related_entity_id
        ? `${baseUrl}/events/${notification.related_entity_id}`
        : `${baseUrl}/member`
    }

    // Prepare push payload
    const payload = {
      title: notification.title,
      body: notification.message,
      icon: '/images/logo-20amanaah.png',
      badge: '/images/logo-20amanaah.png',
      tag: notification.type,
      data: {
        notificationId: notification.id,
        type: notification.type,
        relatedEntityType: notification.related_entity_type,
        relatedEntityId: notification.related_entity_id,
        metadata: notification.metadata || {},
        url: url,
      },
      requireInteraction: notification.type === 'donation_confirmed' || notification.type === 'new_message',
    }

    // Send push to all user's devices
    const result = await sendPushToUser(notification.user_id, payload)

    if (result.sent > 0) {
      console.log('✅ Push notification delivered:', notification.id, `(${result.sent} device(s))`)
      return { success: true }
    } else {
      // No active subscriptions is normal - user just hasn't subscribed yet
      // Only log as info, not a warning
      if (result.errors.length > 0) {
        console.log('⚠️ Push notification not delivered:', notification.id, result.errors[0])
      }
      return { success: false, error: 'No active subscriptions' }
    }
  } catch (error: any) {
    console.error('❌ Exception delivering push:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Main delivery function - orchestrates email and push delivery
 */
export async function deliverNotification(
  notificationId: string
): Promise<{ emailSent: boolean; pushSent: boolean }> {
  try {
    console.log('📧 deliverNotification called for notificationId:', notificationId)
    
    // Fetch notification from database
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single()

    if (error || !notification) {
      console.error('❌ Error fetching notification:', error)
      console.error('   Notification ID:', notificationId)
      return { emailSent: false, pushSent: false }
    }

    console.log('📧 Notification fetched:', {
      id: notification.id,
      type: notification.type,
      userId: notification.user_id,
      title: notification.title,
    })

    // Deliver email
    console.log('📧 Starting email delivery...')
    const emailResult = await deliverEmailNotification(notification)
    console.log('📧 Email delivery completed:', emailResult)

    // Deliver push (TODO: implement)
    const pushResult = await deliverPushNotification(notification)

    return {
      emailSent: emailResult.success,
      pushSent: pushResult.success,
    }
  } catch (error: any) {
    console.error('❌ Exception in deliverNotification:', error)
    console.error('   Error message:', error.message)
    console.error('   Error stack:', error.stack)
    return { emailSent: false, pushSent: false }
  }
}

