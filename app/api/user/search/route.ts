import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'
import { createClient } from '@supabase/supabase-js'

// GET /api/user/search - Search for users by email
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return errorResponse('Email parameter is required', 400)
    }

    // Use service role key to bypass RLS for user search
    // We only return safe fields (id, email, name) for messaging purposes
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
      return errorResponse('Service configuration error', 500)
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Search for user by email (exact match preferred, then partial match)
    // Only return safe fields: id, email, name
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .ilike('email', `%${email}%`)
      .limit(10)

    if (error) {
      console.error('Error searching users:', error)
      return errorResponse('Failed to search users', 500)
    }

    // For now, return the first match (exact or closest)
    // In the future, could return a list for the user to choose from
    if (users && users.length > 0) {
      // Try to find exact match first (case-insensitive)
      const exactMatch = users.find(u => u.email.toLowerCase() === email.toLowerCase())
      return successResponse(exactMatch || users[0])
    }

    return errorResponse('User not found', 404)
  } catch (error: any) {
    console.error('Search user error:', error)
    return errorResponse('Internal server error', 500)
  }
}

