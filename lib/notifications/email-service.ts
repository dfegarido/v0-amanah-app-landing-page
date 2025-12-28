/**
 * Email Notification Service
 * 
 * Handles sending email notifications via Resend API.
 * Can be easily swapped for other providers (SendGrid, AWS SES, etc.)
 */

import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY || '')

// Email configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@amanah.app'
const FROM_NAME = process.env.RESEND_FROM_NAME || 'Amanah'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email notification
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  // If no API key, log and return (dev mode)
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured. Email not sent.')
    console.log('📧 Email would be sent:', {
      to: options.to,
      subject: options.subject,
    })
    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  try {
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      replyTo: options.replyTo,
    })

    if (result.error) {
      console.error('❌ Email send error:', result.error)
      return {
        success: false,
        error: result.error.message || 'Unknown error',
      }
    }

    console.log('✅ Email sent successfully:', result.data?.id)
    return {
      success: true,
      messageId: result.data?.id,
    }
  } catch (error: any) {
    console.error('❌ Email service exception:', error)
    return {
      success: false,
      error: error.message || 'Failed to send email',
    }
  }
}

/**
 * Helper to strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

/**
 * Batch send emails (for admin notifications)
 */
export async function sendBulkEmails(
  recipients: string[],
  subject: string,
  html: string,
  text?: string
): Promise<EmailResult[]> {
  const results: EmailResult[] = []

  // Send emails in parallel (Resend handles rate limiting)
  const promises = recipients.map((to) =>
    sendEmail({ to, subject, html, text })
  )

  const batchResults = await Promise.allSettled(promises)

  batchResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value)
    } else {
      results.push({
        success: false,
        error: result.reason?.message || 'Unknown error',
      })
    }
  })

  return results
}

