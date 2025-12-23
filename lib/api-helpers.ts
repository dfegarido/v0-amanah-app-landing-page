import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserServer, type UserRole } from './auth'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Helper to create success response
export function successResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  })
}

// Helper to create error response
export function errorResponse(error: string, status: number = 400): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  )
}

// Middleware to require authentication (for API routes)
export async function requireAuth(request: NextRequest): Promise<{ user: any; error: null } | { user: null; error: NextResponse }> {
  const user = await getCurrentUserServer(request)
  
  if (!user) {
    return {
      user: null,
      error: errorResponse('Authentication required', 401),
    }
  }

  return { user, error: null }
}

// Middleware to require specific role
export async function requireRole(
  request: NextRequest,
  role: UserRole
): Promise<{ user: any; error: null } | { user: null; error: NextResponse }> {
  const authResult = await requireAuth(request)
  if (authResult.error) return authResult
  
  const user = authResult.user
  if (user.role !== role && user.role !== 'admin') {
    return {
      user: null,
      error: errorResponse('Insufficient permissions', 403),
    }
  }

  return { user, error: null }
}

// Middleware to require any of the specified roles
export async function requireAnyRole(
  request: NextRequest,
  roles: UserRole[]
): Promise<{ user: any; error: null } | { user: null; error: NextResponse }> {
  const authResult = await requireAuth(request)
  if (authResult.error) return authResult

  const user = authResult.user
  if (!roles.includes(user.role) && user.role !== 'admin') {
    return {
      user: null,
      error: errorResponse('Insufficient permissions', 403),
    }
  }

  return { user, error: null }
}

// Parse request body helper
export async function parseRequestBody<T>(request: NextRequest): Promise<T | null> {
  try {
    const body = await request.json()
    return body as T
  } catch (error) {
    return null
  }
}
