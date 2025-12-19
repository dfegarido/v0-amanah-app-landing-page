import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserServer } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserServer(request)

    if (!user) {
      return errorResponse('Not authenticated', 401)
    }

    return successResponse(user, 'User profile retrieved successfully')
  } catch (error: any) {
    console.error('Get user error:', error)
    return errorResponse('Internal server error', 500)
  }
}

