/**
 * Email Templates for Notifications
 * 
 * Provides HTML and plain text email templates for various notification types
 */

export interface EmailTemplateData {
  userName?: string
  [key: string]: any
}

/**
 * Base email template wrapper
 */
export function baseTemplate(content: string, title?: string, logoUrl?: string): string {
  const logoHtml = logoUrl ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${logoUrl}" alt="Amanah Logo" style="max-width: 150px; height: auto;" />
    </div>
  ` : ''
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Amanah Notification'}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    ${logoHtml}
    <h1 style="color: white; margin: 0; font-size: 28px;">Amanah</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    ${content}
  </div>
  <div style="text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 14px;">
    <p>This is an automated notification from Amanah.</p>
    <p>© ${new Date().getFullYear()} Amanah. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Template: New Message Received
 */
export function messageReceivedTemplate(data: {
  userName?: string
  senderName: string
  senderEmail?: string
  subject?: string
  messagePreview?: string
  messageLink?: string
}): string {
  const { userName, senderName, subject, messagePreview, messageLink } = data
  
  const content = `
    <h2 style="color: #1f2937; margin-top: 0;">New Message Received</h2>
    <p>${userName ? `Hi ${userName},` : 'Hi,'}</p>
    <p>You have received a new message from <strong>${senderName}</strong>${subject ? ` about "${subject}"` : ''}.</p>
    ${messagePreview ? `
    <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #6b7280; font-style: italic;">"${messagePreview}"</p>
    </div>
    ` : ''}
    ${messageLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${messageLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Message</a>
    </div>
    ` : ''}
    <p style="color: #6b7280; font-size: 14px;">You can reply to this message directly from your Amanah account.</p>
  `
  
  return baseTemplate(content, subject || 'New Message')
}

/**
 * Template: Donation Confirmed
 */
export function donationConfirmedTemplate(data: {
  userName?: string
  amount: number
  currency: string
  mosqueName?: string
  donationId?: string
  receiptLink?: string
  logoUrl?: string
}): string {
  const { userName, amount, currency, mosqueName, receiptLink, logoUrl } = data
  
  const content = `
    <h2 style="color: #1f2937; margin-top: 0;">🎉 Donation Confirmed</h2>
    <p>${userName ? `Hi ${userName},` : 'Hi,'}</p>
    <p>Thank you for your generous donation!</p>
    <div style="background: #f0fdf4; border: 2px solid #86efac; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0; font-size: 24px; font-weight: bold; color: #166534;">
        ${currency.toUpperCase()} ${amount.toFixed(2)}
      </p>
      ${mosqueName ? `<p style="margin: 5px 0 0 0; color: #6b7280;">to ${mosqueName}</p>` : ''}
    </div>
    <p>Your donation has been successfully processed and will be used to support our community.</p>
    ${receiptLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${receiptLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Download Receipt</a>
    </div>
    ` : ''}
    <p style="color: #6b7280; font-size: 14px;">Barak Allahu feekum (May Allah reward you with goodness).</p>
  `
  
  return baseTemplate(content, 'Donation Confirmed', logoUrl)
}

/**
 * Template: Donation Failed
 */
export function donationFailedTemplate(data: {
  userName?: string
  amount: number
  currency: string
  reason?: string
  retryLink?: string
}): string {
  const { userName, amount, currency, reason, retryLink } = data
  
  const content = `
    <h2 style="color: #dc2626; margin-top: 0;">⚠️ Donation Failed</h2>
    <p>${userName ? `Hi ${userName},` : 'Hi,'}</p>
    <p>We were unable to process your donation of <strong>${currency.toUpperCase()} ${amount.toFixed(2)}</strong>.</p>
    ${reason ? `
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${reason}</p>
    </div>
    ` : ''}
    ${retryLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${retryLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Try Again</a>
    </div>
    ` : ''}
    <p>Please check your payment method and try again. If the problem persists, please contact our support team.</p>
    <p style="color: #6b7280; font-size: 14px;">We appreciate your support and are here to help.</p>
  `
  
  return baseTemplate(content, 'Donation Failed')
}

/**
 * Template: Event Created/Updated
 */
export function eventUpdatedTemplate(data: {
  userName?: string
  eventName: string
  mosqueName?: string
  action: 'created' | 'updated'
  eventLink?: string
  eventDate?: string
  eventTime?: string
}): string {
  const { userName, eventName, mosqueName, action, eventLink, eventDate, eventTime } = data
  const isNew = action === 'created'
  
  const content = `
    <h2 style="color: #1f2937; margin-top: 0;">${isNew ? '📅 New Event' : '✏️ Event Updated'}</h2>
    <p>${userName ? `Hi ${userName},` : 'Hi,'}</p>
    <p>${isNew ? 'A new event has been created' : 'An event has been updated'} in your community!</p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #1f2937;">${eventName}</h3>
      ${mosqueName ? `<p style="margin: 5px 0; color: #6b7280;">📍 ${mosqueName}</p>` : ''}
      ${eventDate ? `<p style="margin: 5px 0; color: #6b7280;">📆 ${eventDate}${eventTime ? ` at ${eventTime}` : ''}</p>` : ''}
    </div>
    ${eventLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${eventLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Event Details</a>
    </div>
    ` : ''}
    <p style="color: #6b7280; font-size: 14px;">Stay connected with your community!</p>
  `
  
  return baseTemplate(content, isNew ? 'New Event' : 'Event Updated')
}

/**
 * Template: Admin Notification (New Donation)
 */
export function adminDonationNotificationTemplate(data: {
  donorName?: string
  donorEmail?: string
  amount: number
  currency: string
  mosqueName?: string
  donationLink?: string
  isAnonymous?: boolean
}): string {
  const { donorName, donorEmail, amount, currency, mosqueName, donationLink, isAnonymous } = data
  
  const content = `
    <h2 style="color: #1f2937; margin-top: 0;">💰 New Donation Received</h2>
    <p>Hello Admin,</p>
    <p>A new donation has been received on the platform.</p>
    <div style="background: #f0fdf4; border: 2px solid #86efac; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0; font-size: 24px; font-weight: bold; color: #166534;">
        ${currency.toUpperCase()} ${amount.toFixed(2)}
      </p>
      <p style="margin: 5px 0 0 0; color: #6b7280;">
        ${isAnonymous ? 'Anonymous Donation' : (donorName || donorEmail || 'Donor')}
        ${mosqueName ? ` • ${mosqueName}` : ''}
      </p>
    </div>
    ${donationLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${donationLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Donation Details</a>
    </div>
    ` : ''}
  `
  
  return baseTemplate(content, 'New Donation Received')
}

