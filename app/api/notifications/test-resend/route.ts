import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { sendEmail } from '@/lib/notifications/email-service'
import { donationConfirmedTemplate } from '@/lib/notifications/email-templates'
import { getServerSupabase } from '@/lib/auth'

/**
 * POST /api/notifications/test-resend
 * Test Resend email configuration and send a test email
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const supabase = getServerSupabase(request)

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return errorResponse('User not found', 404)
    }

    if (!user.email) {
      return errorResponse('User email not found', 400)
    }

    // Check Resend configuration
    const hasApiKey = !!process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@amanahbiz.com'
    const fromName = process.env.RESEND_FROM_NAME || 'Amanah'

    // Generate test email
    const html = donationConfirmedTemplate({
      userName: user.name || undefined,
      amount: 50.00,
      currency: 'USD',
      mosqueName: 'Test Mosque - Al-Amanah',
      donationId: 'test-' + Date.now(),
      receiptLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/member/donations`,
    })

    // Send test email
    console.log('📧 Attempting to send test email...')
    console.log('   To:', user.email)
    console.log('   From:', `${fromName} <${fromEmail}>`)
    console.log('   Has API Key:', hasApiKey)

    const result = await sendEmail({
      to: user.email,
      subject: 'Test: Donation Receipt - Amanah',
      html,
    })

    console.log('📧 Email send result:', result)

    if (!result.success) {
      return errorResponse(
        result.error || 'Failed to send test email',
        500,
        {
          hasApiKey,
          fromEmail,
          fromName,
          error: result.error,
        }
      )
    }

    return successResponse({
      sent: true,
      recipient: user.email,
      messageId: result.messageId,
      config: {
        hasApiKey,
        fromEmail,
        fromName,
      },
    }, `Test donation receipt email sent to ${user.email}`)
  } catch (error: any) {
    console.error('Test Resend error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}
