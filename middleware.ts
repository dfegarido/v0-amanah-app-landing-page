import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Check for Supabase auth token in cookies
  // Supabase stores tokens with project-specific names like: sb-[project-ref]-auth-token
  const cookies = req.cookies.getAll()
  const hasAuthToken = cookies.some(cookie => 
    cookie.name.includes('sb-') && cookie.name.includes('-auth-token') && cookie.value
  )

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/member/register', '/', '/login']
  const isPublicRoute = publicRoutes.some((route) => req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(route))
  
  // Protected routes
  const protectedRoutes = ['/admin', '/member']
  const isProtectedRoute = protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  // Only protect if it's a protected route AND not a public route AND no auth token
  if (isProtectedRoute && !isPublicRoute && !hasAuthToken) {
    // Redirect to auth/login if not authenticated
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

