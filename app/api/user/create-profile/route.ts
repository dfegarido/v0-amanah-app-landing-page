import { NextRequest } from 'next/server'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'

// POST /api/user/create-profile
// Creates a profile for the current user if it doesn't exist
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const userId = authResult.user.id
    const supabase = getServerSupabase(request)

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      return successResponse(
        { message: 'Profile already exists', user_id: userId },
        'Profile already exists'
      )
    }

    // Get user data from auth (we need to use service role for this)
    // For now, use the user data we already have from requireAuth
    const { data: authUser } = await supabase.auth.getUser()
    
    if (!authUser.user) {
      return errorResponse('User not found in auth', 404)
    }

    // Create profile
    const { data: newProfile, error: createError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: authUser.user.email!,
        name: authUser.user.user_metadata?.name || 'User',
        phone: authUser.user.user_metadata?.phone || null,
        role: (authUser.user.user_metadata?.role as 'user' | 'admin') || 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      return errorResponse(`Failed to create profile: ${createError.message}`, 500)
    }

    return successResponse(
      { profile: newProfile },
      'Profile created successfully'
    )
  } catch (error: any) {
    console.error('Create profile error:', error)
    return errorResponse('Internal server error', 500)
  }
}
