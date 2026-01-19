import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'

interface RegisterRequest {
  email: string
  password: string
  name: string
  phone?: string
  role?: 'user' | 'admin' // Only user and admin roles
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody<RegisterRequest>(request)
    
    if (!body || !body.email || !body.password || !body.name) {
      return errorResponse('Missing required fields: email, password, name', 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return errorResponse('Invalid email format', 400)
    }

    // Validate password strength
    if (body.password.length < 8) {
      return errorResponse('Password must be at least 8 characters long', 400)
    }

    // Get the site URL for email confirmation redirect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    'https://www.amanahbiz.com'

    // Create user in Supabase Auth with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/login`,
        data: {
          name: body.name,
          role: body.role || 'user',
          phone: body.phone || null,
        },
      },
    })

    if (authError) {
      return errorResponse(authError.message, 400)
    }

    if (!authData.user) {
      return errorResponse('Failed to create user', 500)
    }

    // Wait a moment for trigger to execute, then fetch user profile
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Get user profile (created by trigger)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (userError || !userData) {
      return errorResponse('Failed to create user profile. Please try again.', 500)
    }

    // Update phone if provided (trigger uses metadata, but we'll update directly)
    if (body.phone) {
      await supabase
        .from('users')
        .update({ phone: body.phone })
        .eq('id', authData.user.id)
    }

    return successResponse(
      {
        user: userData,
        session: authData.session,
      },
      'User registered successfully'
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    return errorResponse('Internal server error', 500)
  }
}
