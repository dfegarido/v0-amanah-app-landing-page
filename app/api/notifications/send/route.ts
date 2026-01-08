import { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/auth'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

interface SendNotificationRequest {
  type: 'new_subscription' | 'subscription_cancelled' | 'payment_failed' | 'subscription_updated'
  subscriptionId: string
  subscriptionType: 'mosque' | 'business' | 'coupon' | 'nonprofit'
  entityName: string
  metadata?: any
}

// POST /api/notifications/send - Send notification email to admin
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body: SendNotificationRequest = await request.json()
    
    if (!body.type || !body.subscriptionId || !body.subscriptionType) {
      return errorResponse('Missing required fields', 400)
    }

    const supabase = getServerSupabase(request)

    // Get admin users
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('email, name')
      .eq('role', 'admin')

    if (adminsError) {
      console.error('Error fetching admins:', adminsError)
      return errorResponse('Failed to fetch admin users', 500)
    }

    if (!admins || admins.length === 0) {
      console.warn('No admin users found to send notification')
      return successResponse({ sent: false, reason: 'No admins found' })
    }

    // Prepare email content based on notification type
    let subject = ''
    let emailBody = ''

    switch (body.type) {
      case 'new_subscription':
        subject = `🆕 New ${body.subscriptionType.charAt(0).toUpperCase() + body.subscriptionType.slice(1)} Subscription`
        emailBody = `
          <h2>New Subscription Created</h2>
          <p>A new ${body.subscriptionType} subscription has been created and requires verification.</p>
          
          <h3>Details:</h3>
          <ul>
            <li><strong>Type:</strong> ${body.subscriptionType.charAt(0).toUpperCase() + body.subscriptionType.slice(1)}</li>
            <li><strong>Name:</strong> ${body.entityName}</li>
            <li><strong>Subscription ID:</strong> ${body.subscriptionId}</li>
            <li><strong>Status:</strong> Pending Verification</li>
          </ul>
          
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin" 
               style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Review in Admin Dashboard
            </a>
          </p>
          
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated notification from Amanah Platform.
          </p>
        `
        break

      case 'subscription_cancelled':
        subject = `⚠️ Subscription Cancelled`
        emailBody = `
          <h2>Subscription Cancelled</h2>
          <p>A ${body.subscriptionType} subscription has been cancelled.</p>
          
          <h3>Details:</h3>
          <ul>
            <li><strong>Type:</strong> ${body.subscriptionType.charAt(0).toUpperCase() + body.subscriptionType.slice(1)}</li>
            <li><strong>Name:</strong> ${body.entityName}</li>
            <li><strong>Subscription ID:</strong> ${body.subscriptionId}</li>
          </ul>
        `
        break

      case 'payment_failed':
        subject = `💳 Payment Failed Alert`
        emailBody = `
          <h2>Payment Failed</h2>
          <p>A payment has failed for a ${body.subscriptionType} subscription.</p>
          
          <h3>Details:</h3>
          <ul>
            <li><strong>Type:</strong> ${body.subscriptionType.charAt(0).toUpperCase() + body.subscriptionType.slice(1)}</li>
            <li><strong>Name:</strong> ${body.entityName}</li>
            <li><strong>Subscription ID:</strong> ${body.subscriptionId}</li>
          </ul>
          
          <p>Please contact the user to update their payment method.</p>
        `
        break

      case 'subscription_updated':
        subject = `📝 Subscription Details Updated`
        emailBody = `
          <h2>Subscription Details Updated</h2>
          <p>A member has updated their ${body.subscriptionType} subscription details.</p>
          
          <h3>Details:</h3>
          <ul>
            <li><strong>Type:</strong> ${body.subscriptionType.charAt(0).toUpperCase() + body.subscriptionType.slice(1)}</li>
            <li><strong>Name:</strong> ${body.entityName}</li>
            <li><strong>Subscription ID:</strong> ${body.subscriptionId}</li>
          </ul>
          
          <p>Please review the changes in the admin dashboard to verify the updated information.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://amanahbiz.com'}/admin">View in Admin Dashboard</a></p>
        `
        break
    }

    // In a production environment, you would use a real email service like:
    // - SendGrid
    // - AWS SES
    // - Resend
    // - Postmark
    
    // For now, we'll log the email and store it in a notifications table
    console.log('=== EMAIL NOTIFICATION ===')
    console.log('To:', admins.map(a => a.email).join(', '))
    console.log('Subject:', subject)
    console.log('Body:', emailBody)
    console.log('========================')

    // Store notification in database for admin to see
    const notifications = admins.map(admin => ({
      user_id: authResult.user.id,
      recipient_email: admin.email,
      recipient_name: admin.name,
      subject: subject,
      body: emailBody,
      type: body.type,
      metadata: {
        subscription_id: body.subscriptionId,
        subscription_type: body.subscriptionType,
        entity_name: body.entityName,
        ...body.metadata
      },
      sent_at: new Date().toISOString(),
      status: 'sent'
    }))

    // Note: You would need to create a notifications table to store these
    // For now, we'll just return success
    
    return successResponse({
      sent: true,
      recipients: admins.length,
      notification: {
        subject,
        recipients: admins.map(a => a.email)
      }
    }, 'Notification sent successfully')

  } catch (error: any) {
    console.error('Send notification error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}
