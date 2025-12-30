/**
 * Notification Hooks Service
 * 
 * This module provides event-driven notification hooks that can be called
 * from various parts of the application. Notifications are stored in the
 * database and can later be delivered via email, push notifications, SMS, etc.
 */

import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export type NotificationType = 
  | 'new_message'
  | 'donation_confirmed'
  | 'donation_failed'
  | 'event_created'
  | 'event_updated'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'payment_failed'
  | 'admin_action'

interface NotificationMetadata {
  [key: string]: any
}

/**
 * Create a notification record in the database
 */
async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata: NotificationMetadata = {},
  relatedEntityType?: string,
  relatedEntityId?: string
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return null
    }

    console.log('✅ Notification created:', { id: data.id, type, userId })
    
    // Trigger email/push delivery asynchronously (don't await to avoid blocking)
    // Import delivery service dynamically to avoid circular dependencies
    import('./delivery-service').then(({ deliverNotification }) => {
      console.log('📧 Starting email delivery for notification:', data.id)
      deliverNotification(data.id)
        .then((result) => {
          console.log('📧 Email delivery result:', result)
        })
        .catch((error) => {
          console.error('❌ Error delivering notification:', error)
          console.error('   Error stack:', error.stack)
        })
    })
    
    return data
  } catch (error: any) {
    console.error('Exception creating notification:', error)
    return null
  }
}

/**
 * Hook: Triggered when a new message is created
 */
export async function onMessageCreated(params: {
  messageId: string
  senderId: string
  recipientId: string
  subject?: string
  body: string
}) {
  const { messageId, recipientId, senderId, subject, body } = params

  try {
    // Get sender name for notification
    const { data: sender } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', senderId)
      .single()

    const senderName = sender?.name || sender?.email || 'Someone'

    // Create notification for recipient
    await createNotification(
      recipientId,
      'new_message',
      subject ? `New message: ${subject}` : 'New message received',
      `${senderName} sent you a message${subject ? `: ${subject}` : ''}`,
      {
        message_id: messageId,
        sender_id: senderId,
        sender_name: sender?.name,
        sender_email: sender?.email,
      },
      'message',
      messageId
    )

    console.log('✅ onMessageCreated hook executed')
  } catch (error: any) {
    console.error('Error in onMessageCreated hook:', error)
  }
}

/**
 * Hook: Triggered when a donation is confirmed/succeeded
 */
export async function onDonationConfirmed(params: {
  donationId: string
  userId?: string
  donorName?: string
  donorEmail?: string
  amount: number
  currency: string
  mosqueId?: string
  mosqueCode?: number
}) {
  const { donationId, userId, donorName, donorEmail, amount, currency, mosqueId, mosqueCode } = params

  console.log('📧 onDonationConfirmed called with:', {
    donationId,
    userId,
    donorEmail,
    amount,
    currency,
    mosqueId,
  })

  try {
    // Get base URL for receipt link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    
    // Generate secure token for receipt access
    const secret = process.env.RECEIPT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret'
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(donationId)
    const token = hmac.digest('hex').substring(0, 32)
    
    // Link to PDF receipt endpoint with token
    const receiptUrl = `${baseUrl}/api/donations/${donationId}/receipt?token=${token}`

    // Get mosque name if mosqueId is provided
    let mosqueName: string | undefined
    if (mosqueId) {
      const { data: mosque } = await supabaseAdmin
        .from('mosques')
        .select('name')
        .eq('id', mosqueId)
        .single()
      mosqueName = mosque?.name
      console.log('📧 Mosque name found:', mosqueName)
    }

    // If user is logged in, notify them
    if (userId) {
      console.log('📧 Creating notification for user:', userId)
      const notification = await createNotification(
        userId,
        'donation_confirmed',
        'Donation Confirmed',
        `Your donation of ${currency} ${amount.toFixed(2)} has been confirmed. Thank you for your support!`,
        {
          donation_id: donationId,
          amount,
          currency,
          mosque_id: mosqueId,
          mosque_code: mosqueCode,
          mosque_name: mosqueName,
          receipt_url: receiptUrl,
        },
        'donation',
        donationId
      )
      if (notification) {
        console.log('✅ Notification created successfully:', notification.id)
      } else {
        console.error('❌ Failed to create notification - notification is null')
      }
    } else if (donorEmail) {
      console.warn('⚠️ No userId provided but donorEmail exists:', donorEmail)
      console.warn('   This is an anonymous donation - email will not be sent automatically')
      console.warn('   Consider implementing direct email sending for anonymous donations if needed')
    } else {
      console.warn('⚠️ No userId and no donorEmail - cannot send notification')
    }

    // Also notify admins (optional - you may want to filter this)
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      // Get admin notification record to send email
      const adminNotification = await createNotification(
        admins[0].id, // Use first admin for DB record
        'donation_confirmed',
        'New Donation Received',
        `A donation of ${currency} ${amount.toFixed(2)} was made${donorName ? ` by ${donorName}` : ''}.`,
        {
          donation_id: donationId,
          donor_name: donorName,
          donor_email: donorEmail,
          amount,
          currency,
          mosque_id: mosqueId,
          mosque_code: mosqueCode,
          is_anonymous: !donorName && !donorEmail,
        },
        'donation',
        donationId
      )

      // Send email to all admins
      if (adminNotification) {
        const adminEmails = admins.map(a => a.email).filter(Boolean) as string[]
        if (adminEmails.length > 0) {
          import('./delivery-service').then(({ deliverAdminEmailNotification }) => {
            deliverAdminEmailNotification(adminNotification, adminEmails).catch((error) => {
              console.error('Error delivering admin emails:', error)
            })
          })
        }
      }
    }

    console.log('✅ onDonationConfirmed hook executed')
  } catch (error: any) {
    console.error('❌ Error in onDonationConfirmed hook:', error)
    console.error('   Error message:', error.message)
    console.error('   Error stack:', error.stack)
    throw error // Re-throw to ensure webhook handler sees the error
  }
}

/**
 * Hook: Triggered when a donation fails
 */
export async function onDonationFailed(params: {
  donationId: string
  userId?: string
  donorEmail?: string
  amount: number
  currency: string
  reason?: string
}) {
  const { donationId, userId, donorEmail, amount, currency, reason } = params

  try {
    if (userId) {
      await createNotification(
        userId,
        'donation_failed',
        'Donation Failed',
        `Your donation of ${currency} ${amount.toFixed(2)} could not be processed.${reason ? ` Reason: ${reason}` : ''} Please try again or contact support.`,
        {
          donation_id: donationId,
          amount,
          currency,
          reason,
        },
        'donation',
        donationId
      )
    }

    console.log('✅ onDonationFailed hook executed')
  } catch (error: any) {
    console.error('Error in onDonationFailed hook:', error)
  }
}

/**
 * Hook: Triggered when an event is created or updated
 */
export async function onEventUpdated(params: {
  eventId: string
  mosqueId?: string
  mosqueCode?: number
  eventName: string
  action: 'created' | 'updated'
  userIds?: string[] // Specific users to notify (optional)
}) {
  const { eventId, mosqueId, mosqueCode, eventName, action, userIds } = params

  try {
    const notificationType = action === 'created' ? 'event_created' : 'event_updated'
    const title = action === 'created' ? 'New Event' : 'Event Updated'
    const message = action === 'created'
      ? `A new event "${eventName}" has been created.`
      : `The event "${eventName}" has been updated.`

    // If specific users provided, notify only them
    if (userIds && userIds.length > 0) {
      for (const userId of userIds) {
        await createNotification(
          userId,
          notificationType,
          title,
          message,
          {
            event_id: eventId,
            event_name: eventName,
            mosque_id: mosqueId,
            mosque_code: mosqueCode,
          },
          'event',
          eventId
        )
      }
    } else {
      // Otherwise, notify all users subscribed to the mosque (if applicable)
      // For now, we'll just notify admins
      const { data: admins } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await createNotification(
            admin.id,
            notificationType,
            title,
            message,
            {
              event_id: eventId,
              event_name: eventName,
              mosque_id: mosqueId,
              mosque_code: mosqueCode,
            },
            'event',
            eventId
          )
        }
      }
    }

    console.log('✅ onEventUpdated hook executed')
  } catch (error: any) {
    console.error('Error in onEventUpdated hook:', error)
  }
}

/**
 * Hook: Triggered when a subscription is created
 */
export async function onSubscriptionCreated(params: {
  subscriptionId: string
  userId: string
  subscriptionType: string
  entityName: string
}) {
  const { subscriptionId, userId, subscriptionType, entityName } = params

  try {
    await createNotification(
      userId,
      'subscription_created',
      'Subscription Created',
      `Your ${subscriptionType} subscription for "${entityName}" has been created and is pending verification.`,
      {
        subscription_id: subscriptionId,
        subscription_type: subscriptionType,
        entity_name: entityName,
      },
      'subscription',
      subscriptionId
    )

    console.log('✅ onSubscriptionCreated hook executed')
  } catch (error: any) {
    console.error('Error in onSubscriptionCreated hook:', error)
  }
}

/**
 * Hook: Triggered when payment fails
 */
export async function onPaymentFailed(params: {
  subscriptionId?: string
  donationId?: string
  userId: string
  amount: number
  currency: string
  reason?: string
}) {
  const { subscriptionId, donationId, userId, amount, currency, reason } = params

  try {
    await createNotification(
      userId,
      'payment_failed',
      'Payment Failed',
      `A payment of ${currency} ${amount.toFixed(2)} could not be processed.${reason ? ` Reason: ${reason}` : ''} Please update your payment method.`,
      {
        subscription_id: subscriptionId,
        donation_id: donationId,
        amount,
        currency,
        reason,
      }
    )

    console.log('✅ onPaymentFailed hook executed')
  } catch (error: any) {
    console.error('Error in onPaymentFailed hook:', error)
  }
}
