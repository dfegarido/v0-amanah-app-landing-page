import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/auth'
import { requireAuth, successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'

interface UpdateProfileRequest {
  name?: string
  phone?: string
  email?: string
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    return successResponse(authResult.user, 'Profile retrieved successfully')
  } catch (error: any) {
    console.error('Get profile error:', error)
    return errorResponse('Internal server error', 500)
  }
}

async function updateProfile(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const body = await parseRequestBody<UpdateProfileRequest>(request)
    if (!body) {
      return errorResponse('Invalid request body', 400)
    }

    const supabase = getServerSupabase(request)
    
    const updateData: Partial<UpdateProfileRequest> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.phone !== undefined) updateData.phone = body.phone

    // Update email requires auth update
    if (body.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: body.email,
      })
      if (emailError) {
        return errorResponse('Failed to update email', 400)
      }
      updateData.email = body.email
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', authResult.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return errorResponse('Failed to update profile', 500)
    }

    return successResponse(updatedUser, 'Profile updated successfully')
  } catch (error: any) {
    console.error('Update profile error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// Support both PUT and PATCH
export async function PUT(request: NextRequest) {
  return updateProfile(request)
}

export async function PATCH(request: NextRequest) {
  return updateProfile(request)
}
