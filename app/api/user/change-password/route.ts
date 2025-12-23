import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'
import { createClient } from '@supabase/supabase-js'

interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body = await parseRequestBody<ChangePasswordRequest>(request)
    
    if (!body || !body.currentPassword || !body.newPassword) {
      return errorResponse('Current password and new password are required', 400)
    }

    // Validate new password strength
    if (body.newPassword.length < 8) {
      return errorResponse('New password must be at least 8 characters long', 400)
    }

    const user = authResult.user

    // Verify current password by attempting to sign in
    const verifyClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: signInData, error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password: body.currentPassword,
    })

    if (verifyError) {
      console.error('Current password verification failed:', verifyError)
      return errorResponse('Current password is incorrect', 401)
    }

    if (!signInData.user) {
      return errorResponse('Failed to verify current password', 401)
    }

    // Use admin client to update password
    // Check if we have a service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment variables')
      return errorResponse('Server configuration error', 500)
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: body.newPassword }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return errorResponse(`Failed to update password: ${updateError.message}`, 500)
    }

    console.log('Password updated successfully for user:', user.email)

    return successResponse(
      { message: 'Password updated successfully' },
      'Password changed successfully'
    )
  } catch (error: any) {
    console.error('Change password error:', error)
    return errorResponse(`Internal server error: ${error.message}`, 500)
  }
}
