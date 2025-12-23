import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'

interface LoginRequest {
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody<LoginRequest>(request)
    
    if (!body || !body.email || !body.password) {
      return errorResponse('Email and password are required', 400)
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (authError) {
      return errorResponse('Invalid email or password', 401)
    }

    if (!authData.user || !authData.session) {
      return errorResponse('Authentication failed', 401)
    }

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (userError || !user) {
      return errorResponse('User profile not found', 404)
    }

    return successResponse(
      {
        user,
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at,
        },
      },
      'Login successful'
    )
  } catch (error: any) {
    console.error('Login error:', error)
    return errorResponse('Internal server error', 500)
  }
}
