import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    const { error } = await supabase.auth.signOut()

    if (error) {
      return errorResponse('Failed to logout', 500)
    }

    return successResponse(null, 'Logged out successfully')
  } catch (error: any) {
    console.error('Logout error:', error)
    return errorResponse('Internal server error', 500)
  }
}

